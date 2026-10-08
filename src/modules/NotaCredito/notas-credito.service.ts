import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  addMoney,
  subtractMoney,
  toMoney,
} from '../../common/utils/money.util';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import {
  Factura,
  FacturaEstado,
} from '../facturas/entities/factura.entity';
import { CreateNotaCreditoDto } from './dto/create-nota-credito.dto';
import { FindNotasCreditoQueryDto } from './dto/find-notas-credito-query.dto';
import { UpdateNotaCreditoDto } from './dto/update-nota-credito.dto';
import {
  NotaCredito,
  NotaCreditoEstado,
} from './entities/nota-credito.entity';
import {
  NotaCreditoAuditoria,
  NotaCreditoAuditoriaAccion,
} from './entities/nota-credito-auditoria.entity';
import { NotasCreditoNotificationService } from './notas-credito.notification.service';
import { randomUUID } from 'crypto';

@Injectable()
export class NotasCreditoService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(NotaCredito)
    private readonly notasRepository: Repository<NotaCredito>,

    @InjectRepository(NotaCreditoAuditoria)
    private readonly auditoriaRepository: Repository<NotaCreditoAuditoria>,

    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,

    private readonly notificationService: NotasCreditoNotificationService,
  ) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateNotaCreditoDto,
  ): Promise<NotaCredito> {
    const result = await this.dataSource.transaction(async (manager) => {
      const factura = await manager.findOne(Factura, {
        where: {
          id: dto.facturaId,
          tenantId: user.tenantId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!factura) {
        throw new NotFoundException('Factura no encontrada');
      }

      if (factura.estado !== FacturaEstado.EMITIDA) {
        throw new BadRequestException(
          'Solo se pueden emitir notas de crédito sobre facturas emitidas',
        );
      }

      const monto = toMoney(dto.monto);

      if (!monto.greaterThan(0)) {
        throw new BadRequestException('El monto debe ser mayor que cero');
      }

      if (monto.greaterThan(toMoney(factura.saldoPendiente))) {
        throw new BadRequestException(
          'El monto de la nota supera el saldo pendiente de la factura',
        );
      }

      const saldoAnterior = factura.saldoPendiente;

      const nota = manager.create(NotaCredito, {
        tenantId: user.tenantId,
        facturaId: factura.id,
        numeroNota: this.generateNotaNumber(),
        monto: monto.toFixed(2),
        motivo: dto.motivo,
        estado: NotaCreditoEstado.EMITIDA,
        createdBy: user.userId,
      });

      const savedNota = await manager.save(NotaCredito, nota);

      factura.saldoPendiente = subtractMoney(
        factura.saldoPendiente,
        savedNota.monto,
      );

      await manager.save(Factura, factura);

      await manager.save(
        NotaCreditoAuditoria,
        manager.create(NotaCreditoAuditoria, {
          tenantId: user.tenantId,
          notaCreditoId: savedNota.id,
          facturaId: factura.id,
          userId: user.userId,
          accion: NotaCreditoAuditoriaAccion.CREATE,
          montoAnterior: null,
          montoNuevo: savedNota.monto,
          saldoAnterior,
          saldoNuevo: factura.saldoPendiente,
          estadoAnterior: null,
          estadoNuevo: savedNota.estado,
          resultado: 'SUCCESS',
        }),
      );

      return { nota: savedNota, factura };
    });

    await this.notificationService.notifyIssued({
      numeroNota: result.nota.numeroNota,
      facturaId: result.factura.id,
      monto: result.nota.monto,
    });

    return result.nota;
  }

  async findAll(
    user: AuthenticatedUser,
    query: FindNotasCreditoQueryDto,
  ): Promise<NotaCredito[]> {
    return this.notasRepository.find({
      where: {
        tenantId: user.tenantId,
        ...(query.estado ? { estado: query.estado } : {}),
        ...(query.facturaId ? { facturaId: query.facturaId } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<NotaCredito> {
    const nota = await this.notasRepository.findOne({
      where: { id, tenantId: user.tenantId },
      relations: { factura: true },
    });

    if (!nota) {
      throw new NotFoundException('Nota de crédito no encontrada');
    }

    return nota;
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateNotaCreditoDto,
  ): Promise<NotaCredito> {
    const result = await this.dataSource.transaction(async (manager) => {
      const notaExistente = await manager.findOne(NotaCredito, {
        where: { id, tenantId: user.tenantId },
      });

      if (!notaExistente) {
        throw new NotFoundException('Nota de crédito no encontrada');
      }

      const factura = await manager.findOne(Factura, {
        where: {
          id: notaExistente.facturaId,
          tenantId: user.tenantId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!factura) {
        throw new NotFoundException('Factura no encontrada');
      }

      const nota = await manager.findOne(NotaCredito, {
        where: { id, tenantId: user.tenantId },
      });

      if (!nota) {
        throw new NotFoundException('Nota de crédito no encontrada');
      }

      if (nota.estado !== NotaCreditoEstado.EMITIDA) {
        throw new BadRequestException(
          'Una nota anulada no puede ser modificada',
        );
      }

      const montoAnterior = nota.monto;
      const saldoAnterior = factura.saldoPendiente;
      const montoNuevo = dto.monto ?? montoAnterior;

      const delta = toMoney(montoNuevo).minus(toMoney(montoAnterior));
      const nuevoSaldo = toMoney(saldoAnterior).minus(delta);

      if (nuevoSaldo.lessThan(0)) {
        throw new BadRequestException(
          'La actualización dejaría el saldo de la factura en negativo',
        );
      }

      if (nuevoSaldo.greaterThan(toMoney(factura.montoTotal))) {
        throw new BadRequestException(
          'El saldo resultante no puede superar el monto total de la factura',
        );
      }

      nota.monto = toMoney(montoNuevo).toFixed(2);

      if (dto.motivo !== undefined) {
        nota.motivo = dto.motivo;
      }

      nota.updatedBy = user.userId;
      factura.saldoPendiente = nuevoSaldo.toFixed(2);

      await manager.save(NotaCredito, nota);
      await manager.save(Factura, factura);

      await manager.save(
        NotaCreditoAuditoria,
        manager.create(NotaCreditoAuditoria, {
          tenantId: user.tenantId,
          notaCreditoId: nota.id,
          facturaId: factura.id,
          userId: user.userId,
          accion: NotaCreditoAuditoriaAccion.UPDATE,
          montoAnterior,
          montoNuevo: nota.monto,
          saldoAnterior,
          saldoNuevo: factura.saldoPendiente,
          estadoAnterior: NotaCreditoEstado.EMITIDA,
          estadoNuevo: NotaCreditoEstado.EMITIDA,
          resultado: 'SUCCESS',
        }),
      );

      return { nota, factura };
    });

    await this.notificationService.notifyIssued({
      numeroNota: result.nota.numeroNota,
      facturaId: result.factura.id,
      monto: result.nota.monto,
    });

    return result.nota;
  }

  async remove(
    user: AuthenticatedUser,
    id: string,
  ): Promise<NotaCredito> {
    const result = await this.dataSource.transaction(async (manager) => {
      const notaExistente = await manager.findOne(NotaCredito, {
        where: { id, tenantId: user.tenantId },
      });

      if (!notaExistente) {
        throw new NotFoundException('Nota de crédito no encontrada');
      }

      const factura = await manager.findOne(Factura, {
        where: {
          id: notaExistente.facturaId,
          tenantId: user.tenantId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!factura) {
        throw new NotFoundException('Factura no encontrada');
      }

      const nota = await manager.findOne(NotaCredito, {
        where: { id, tenantId: user.tenantId },
      });

      if (!nota) {
        throw new NotFoundException('Nota de crédito no encontrada');
      }

      if (nota.estado !== NotaCreditoEstado.EMITIDA) {
        throw new BadRequestException('La nota de crédito ya está anulada');
      }

      const saldoAnterior = factura.saldoPendiente;
      const nuevoSaldo = addMoney(
        factura.saldoPendiente,
        nota.monto,
      );

      if (toMoney(nuevoSaldo).greaterThan(toMoney(factura.montoTotal))) {
        throw new BadRequestException(
          'La anulación produciría un saldo inconsistente',
        );
      }

      nota.estado = NotaCreditoEstado.ANULADA;
      nota.updatedBy = user.userId;
      nota.anuladaBy = user.userId;
      nota.anuladaAt = new Date();

      factura.saldoPendiente = nuevoSaldo;

      await manager.save(NotaCredito, nota);
      await manager.save(Factura, factura);

      await manager.save(
        NotaCreditoAuditoria,
        manager.create(NotaCreditoAuditoria, {
          tenantId: user.tenantId,
          notaCreditoId: nota.id,
          facturaId: factura.id,
          userId: user.userId,
          accion: NotaCreditoAuditoriaAccion.ANNUL,
          montoAnterior: nota.monto,
          montoNuevo: nota.monto,
          saldoAnterior,
          saldoNuevo: factura.saldoPendiente,
          estadoAnterior: NotaCreditoEstado.EMITIDA,
          estadoNuevo: NotaCreditoEstado.ANULADA,
          resultado: 'SUCCESS',
        }),
      );

      return { nota, factura };
    });

    await this.notificationService.notifyAnnulled({
      numeroNota: result.nota.numeroNota,
      facturaId: result.factura.id,
      monto: result.nota.monto,
    });

    return result.nota;
  }

  async findAuditByNote(
    user: AuthenticatedUser,
    notaId: string,
  ): Promise<NotaCreditoAuditoria[]> {
    const nota = await this.notasRepository.findOne({
      where: { id: notaId, tenantId: user.tenantId },
    });

    if (!nota) {
      throw new NotFoundException('Nota de crédito no encontrada');
    }

    return this.auditoriaRepository.find({
      where: {
        tenantId: user.tenantId,
        notaCreditoId: notaId,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findAuditByFactura(
    user: AuthenticatedUser,
    facturaId: string,
  ): Promise<NotaCreditoAuditoria[]> {
    const factura = await this.facturasRepository.findOne({
      where: {
        id: facturaId,
        tenantId: user.tenantId,
      },
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    return this.auditoriaRepository.find({
      where: {
        tenantId: user.tenantId,
        facturaId,
      },
      order: { createdAt: 'ASC' },
    });
  }

  private generateNotaNumber(): string {
    return `NC-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  }
}
