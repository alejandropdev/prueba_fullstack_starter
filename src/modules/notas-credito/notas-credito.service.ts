import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import {
  MONEY_MAX,
  addMoney,
  isEqualMoney,
  isGreaterThan,
  isNegativeMoney,
  isPositiveMoney,
  subtractMoney,
  toMoney,
} from '../../common/utils/money.util';
import { Factura, FacturaEstado } from '../facturas/entities/factura.entity';
import { User } from '../users/entities/user.entity';
import { AnularNotaCreditoDto } from './dto/anular-nota-credito.dto';
import { CorregirNotaCreditoDto } from './dto/corregir-nota-credito.dto';
import { CreateNotaCreditoDto } from './dto/create-nota-credito.dto';
import { FindNotasCreditoQueryDto } from './dto/find-notas-credito-query.dto';
import { FindNotificacionesQueryDto } from './dto/find-notificaciones-query.dto';
import { NotaCreditoHistorial, NotaCreditoAccion } from './entities/nota-credito-historial.entity';
import { NotaCredito, NotaCreditoEstado } from './entities/nota-credito.entity';
import { Notificacion, NotificacionTipo } from './entities/notificacion.entity';

@Injectable()
export class NotasCreditoService {
  private readonly logger = new Logger(NotasCreditoService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(NotaCredito)
    private readonly notasRepo: Repository<NotaCredito>,
    @InjectRepository(NotaCreditoHistorial)
    private readonly historialRepo: Repository<NotaCreditoHistorial>,
    @InjectRepository(Notificacion)
    private readonly notificacionesRepo: Repository<Notificacion>,
  ) {}

  async emitir(user: AuthenticatedUser, dto: CreateNotaCreditoDto) {
    const monto = this.normalizarMonto(dto.monto);
    const resultado = await this.transaccion((manager) =>
      this.emitirEnTransaccion(manager, user, dto, monto),
    );
    this.registrarLogAviso(resultado.notificacion);
    return this.presentarMutacion(resultado);
  }

  findAll(user: AuthenticatedUser, query: FindNotasCreditoQueryDto) {
    const where: FindOptionsWhere<NotaCredito> = { tenantId: user.tenantId };
    if (query.estado) where.estado = query.estado;
    if (query.facturaId) where.facturaId = query.facturaId;
    if (query.clienteEmail) where.clienteEmail = query.clienteEmail;

    return this.notasRepo
      .find({
        where,
        relations: { factura: true },
        order: { createdAt: 'DESC' },
      })
      .then((notas) => notas.map((nota) => this.presentarNota(nota, nota.factura)));
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const nota = await this.buscarNota(id, user.tenantId);
    const historial = await this.buscarHistorial(id, user.tenantId);
    return {
      ...this.presentarNota(nota, nota.factura),
      historial: historial.map(this.presentarEvento),
    };
  }

  async findHistorial(id: string, user: AuthenticatedUser) {
    await this.buscarNota(id, user.tenantId);
    const historial = await this.buscarHistorial(id, user.tenantId);
    return historial.map(this.presentarEvento);
  }

  async corregir(id: string, user: AuthenticatedUser, dto: CorregirNotaCreditoDto) {
    if (dto.monto === undefined && dto.motivo === undefined) {
      throw new BadRequestException('Indica el monto o el motivo a corregir');
    }

    const montoNuevo = dto.monto === undefined ? undefined : this.normalizarMonto(dto.monto);
    const resultado = await this.transaccion((manager) =>
      this.corregirEnTransaccion(manager, id, user, dto, montoNuevo),
    );
    this.registrarLogAviso(resultado.notificacion);
    return this.presentarMutacion(resultado);
  }

  async anular(id: string, user: AuthenticatedUser, dto: AnularNotaCreditoDto) {
    const resultado = await this.transaccion((manager) =>
      this.anularEnTransaccion(manager, id, user, dto),
    );
    this.registrarLogAviso(resultado.notificacion);
    return this.presentarMutacion(resultado);
  }

  findAvisos(user: AuthenticatedUser, query: FindNotificacionesQueryDto) {
    const where: FindOptionsWhere<Notificacion> = { tenantId: user.tenantId };
    if (query.tipo) where.tipo = query.tipo;
    if (query.facturaId) where.facturaId = query.facturaId;
    if (query.notaCreditoId) where.notaCreditoId = query.notaCreditoId;
    if (query.clienteEmail) where.clienteEmail = query.clienteEmail;

    return this.notificacionesRepo
      .find({ where, order: { createdAt: 'DESC' } })
      .then((avisos) => avisos.map(this.presentarAviso));
  }

  private async emitirEnTransaccion(
    manager: EntityManager,
    user: AuthenticatedUser,
    dto: CreateNotaCreditoDto,
    monto: string,
  ) {
    await this.bloquearTenant(manager, user.tenantId);
    const factura = await this.bloquearFactura(manager, dto.facturaId, user.tenantId);
    this.assertFacturaEmitida(factura);

    const saldoAnterior = factura.saldoPendiente;
    const saldoNuevo = subtractMoney(saldoAnterior, monto);
    this.assertSaldoEnRango(saldoNuevo, factura.montoTotal);

    const usuario = await this.resolverUsuario(manager, user);
    const numero = await this.siguienteNumero(manager, user.tenantId);
    const nota = await manager.save(
      manager.create(NotaCredito, {
        tenantId: user.tenantId,
        facturaId: factura.id,
        usuarioId: usuario.id,
        numero,
        monto,
        motivo: dto.motivo,
        estado: NotaCreditoEstado.EMITIDA,
        clienteNombre: dto.clienteNombre,
        clienteEmail: dto.clienteEmail,
      }),
    );

    factura.saldoPendiente = saldoNuevo;
    await manager.save(factura);

    const evento = await this.guardarEvento(manager, {
      nota,
      usuario,
      accion: NotaCreditoAccion.EMITIDA,
      montoAnterior: null,
      montoNuevo: monto,
      saldoAnterior,
      saldoNuevo,
      motivoAnterior: null,
      motivo: dto.motivo,
    });
    const notificacion = await this.guardarAviso(manager, {
      nota,
      factura,
      tipo: NotificacionTipo.EMITIDA,
      saldoNuevo,
      montoAnterior: null,
    });

    return { nota, factura, historial: [evento], notificacion };
  }

  private async corregirEnTransaccion(
    manager: EntityManager,
    id: string,
    user: AuthenticatedUser,
    dto: CorregirNotaCreditoDto,
    montoSolicitado: string | undefined,
  ) {
    const { nota, factura, usuario } = await this.bloquearNotaYFactura(manager, id, user);
    this.assertNotaEmitida(nota, 'corregir');
    this.assertFacturaEmitida(factura);

    const montoNuevo = montoSolicitado ?? nota.monto;
    const motivoNuevo = dto.motivo ?? nota.motivo;
    if (isEqualMoney(montoNuevo, nota.monto) && motivoNuevo === nota.motivo) {
      throw new BadRequestException('La nota no tiene cambios para corregir');
    }

    const saldoAnterior = factura.saldoPendiente;
    const montoAnterior = nota.monto;
    const motivoAnterior = nota.motivo;
    const saldoNuevo = subtractMoney(addMoney(saldoAnterior, montoAnterior), montoNuevo);
    this.assertSaldoEnRango(saldoNuevo, factura.montoTotal);

    nota.monto = montoNuevo;
    nota.motivo = motivoNuevo;
    await manager.save(nota);

    factura.saldoPendiente = saldoNuevo;
    await manager.save(factura);

    await this.guardarEvento(manager, {
      nota,
      usuario,
      accion: NotaCreditoAccion.CORREGIDA,
      montoAnterior,
      montoNuevo,
      saldoAnterior,
      saldoNuevo,
      motivoAnterior,
      motivo: motivoNuevo,
    });
    const notificacion = await this.guardarAviso(manager, {
      nota,
      factura,
      tipo: NotificacionTipo.CORREGIDA,
      saldoNuevo,
      montoAnterior,
    });
    const historial = await this.buscarHistorialCon(manager, nota.id, user.tenantId);

    return { nota, factura, historial, notificacion };
  }

  private async anularEnTransaccion(
    manager: EntityManager,
    id: string,
    user: AuthenticatedUser,
    dto: AnularNotaCreditoDto,
  ) {
    const { nota, factura, usuario } = await this.bloquearNotaYFactura(manager, id, user);
    this.assertNotaEmitida(nota, 'anular');
    this.assertFacturaEmitida(factura);

    const saldoAnterior = factura.saldoPendiente;
    const saldoNuevo = addMoney(saldoAnterior, nota.monto);
    this.assertSaldoEnRango(saldoNuevo, factura.montoTotal);

    const motivoAnterior = nota.motivo;
    nota.estado = NotaCreditoEstado.ANULADA;
    await manager.save(nota);

    factura.saldoPendiente = saldoNuevo;
    await manager.save(factura);

    await this.guardarEvento(manager, {
      nota,
      usuario,
      accion: NotaCreditoAccion.ANULADA,
      montoAnterior: nota.monto,
      montoNuevo: nota.monto,
      saldoAnterior,
      saldoNuevo,
      motivoAnterior,
      motivo: dto.motivo,
    });
    const notificacion = await this.guardarAviso(manager, {
      nota,
      factura,
      tipo: NotificacionTipo.ANULADA,
      saldoNuevo,
      montoAnterior: nota.monto,
      motivoAnulacion: dto.motivo,
    });
    const historial = await this.buscarHistorialCon(manager, nota.id, user.tenantId);

    return { nota, factura, historial, notificacion };
  }

  private async bloquearNotaYFactura(manager: EntityManager, id: string, user: AuthenticatedUser) {
    await this.bloquearTenant(manager, user.tenantId);
    const vista = await manager.findOne(NotaCredito, { where: { id, tenantId: user.tenantId } });
    if (!vista) {
      throw new NotFoundException('Nota de crédito no encontrada');
    }

    const factura = await this.bloquearFactura(manager, vista.facturaId, user.tenantId);
    const nota = await manager
      .createQueryBuilder(NotaCredito, 'nota')
      .setLock('pessimistic_write')
      .where('nota.id = :id', { id })
      .andWhere('nota.tenant_id = :tenantId', { tenantId: user.tenantId })
      .getOne();
    if (!nota) {
      throw new NotFoundException('Nota de crédito no encontrada');
    }

    const usuario = await this.resolverUsuario(manager, user);
    return { nota, factura, usuario };
  }

  // Serializa las operaciones de dinero de un mismo tenant para que dos
  // solicitudes simultáneas no calculen el saldo a partir del mismo valor.
  private bloquearTenant(manager: EntityManager, tenantId: string) {
    return manager.query(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, [
      'notas-credito',
      tenantId,
    ]);
  }

  private async bloquearFactura(manager: EntityManager, facturaId: string, tenantId: string) {
    const factura = await manager
      .createQueryBuilder(Factura, 'factura')
      .setLock('pessimistic_write')
      .where('factura.id = :facturaId', { facturaId })
      .andWhere('factura.tenant_id = :tenantId', { tenantId })
      .getOne();
    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }
    return factura;
  }

  private async resolverUsuario(manager: EntityManager, user: AuthenticatedUser) {
    const usuario = await manager.findOne(User, {
      where: { id: user.userId, tenantId: user.tenantId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  private async siguienteNumero(manager: EntityManager, tenantId: string) {
    const total = await manager.count(NotaCredito, { where: { tenantId } });
    return `NC-${String(total + 1).padStart(4, '0')}`;
  }

  private assertFacturaEmitida(factura: Factura) {
    if (factura.estado !== FacturaEstado.EMITIDA) {
      throw new ConflictException(
        `La factura está en estado ${factura.estado} y no admite notas de crédito`,
      );
    }
  }

  private assertNotaEmitida(nota: NotaCredito, accion: 'corregir' | 'anular') {
    if (nota.estado === NotaCreditoEstado.EMITIDA) return;
    if (accion === 'anular') {
      throw new ConflictException('La nota de crédito ya está anulada');
    }
    throw new ConflictException('La nota de crédito está anulada y no se puede modificar');
  }

  private assertSaldoEnRango(saldo: string, montoTotal: string) {
    if (isNegativeMoney(saldo)) {
      throw new BadRequestException('El monto supera el saldo pendiente de la factura');
    }
    if (isGreaterThan(saldo, montoTotal)) {
      throw new BadRequestException('El saldo resultante supera el monto total de la factura');
    }
  }

  private normalizarMonto(monto: string) {
    let decimal: ReturnType<typeof toMoney>;
    try {
      decimal = toMoney(monto);
    } catch {
      throw new BadRequestException('Monto inválido');
    }
    if (!decimal.isFinite() || decimal.decimalPlaces() > 2) {
      throw new BadRequestException('El monto admite máximo 2 decimales');
    }
    const normalizado = decimal.toFixed(2);
    if (!isPositiveMoney(normalizado) || isGreaterThan(normalizado, MONEY_MAX)) {
      throw new BadRequestException('El monto debe ser mayor a cero y no superar 999999999999.99');
    }
    return normalizado;
  }

  private guardarEvento(
    manager: EntityManager,
    datos: {
      nota: NotaCredito;
      usuario: User;
      accion: NotaCreditoAccion;
      montoAnterior: string | null;
      montoNuevo: string | null;
      saldoAnterior: string;
      saldoNuevo: string;
      motivoAnterior: string | null;
      motivo: string;
    },
  ) {
    return manager.save(
      manager.create(NotaCreditoHistorial, {
        tenantId: datos.nota.tenantId,
        notaCreditoId: datos.nota.id,
        facturaId: datos.nota.facturaId,
        usuarioId: datos.usuario.id,
        usuarioNombre: datos.usuario.fullName,
        usuarioEmail: datos.usuario.email,
        accion: datos.accion,
        montoAnterior: datos.montoAnterior,
        montoNuevo: datos.montoNuevo,
        saldoAnterior: datos.saldoAnterior,
        saldoNuevo: datos.saldoNuevo,
        motivoAnterior: datos.motivoAnterior,
        motivo: datos.motivo,
      }),
    );
  }

  private guardarAviso(
    manager: EntityManager,
    datos: {
      nota: NotaCredito;
      factura: Factura;
      tipo: NotificacionTipo;
      saldoNuevo: string;
      montoAnterior: string | null;
      motivoAnulacion?: string;
    },
  ) {
    const moneda = datos.factura.moneda.trim();
    const texto = this.textoAviso(datos, moneda);
    return manager.save(
      manager.create(Notificacion, {
        tenantId: datos.nota.tenantId,
        facturaId: datos.factura.id,
        notaCreditoId: datos.nota.id,
        clienteNombre: datos.nota.clienteNombre,
        clienteEmail: datos.nota.clienteEmail,
        tipo: datos.tipo,
        asunto: texto.asunto,
        mensaje: texto.mensaje,
      }),
    );
  }

  private textoAviso(
    datos: {
      nota: NotaCredito;
      factura: Factura;
      tipo: NotificacionTipo;
      saldoNuevo: string;
      montoAnterior: string | null;
      motivoAnulacion?: string;
    },
    moneda: string,
  ) {
    const factura = datos.factura.numeroFactura;
    const numero = datos.nota.numero;
    const saldo = `${datos.saldoNuevo} ${moneda}`;

    if (datos.tipo === NotificacionTipo.EMITIDA) {
      return {
        asunto: `Nota de crédito ${numero} emitida`,
        mensaje:
          `Hola ${datos.nota.clienteNombre}, se emitió la nota de crédito ${numero} ` +
          `por ${datos.nota.monto} ${moneda} sobre la factura ${factura}. ` +
          `Motivo: ${datos.nota.motivo}. Saldo pendiente: ${saldo}.`,
      };
    }

    if (datos.tipo === NotificacionTipo.CORREGIDA) {
      return {
        asunto: `Nota de crédito ${numero} corregida`,
        mensaje:
          `Hola ${datos.nota.clienteNombre}, se corrigió la nota de crédito ${numero} ` +
          `de la factura ${factura}. Monto anterior: ${datos.montoAnterior} ${moneda}. ` +
          `Monto nuevo: ${datos.nota.monto} ${moneda}. Motivo: ${datos.nota.motivo}. ` +
          `Saldo pendiente: ${saldo}.`,
      };
    }

    return {
      asunto: `Nota de crédito ${numero} anulada`,
      mensaje:
        `Hola ${datos.nota.clienteNombre}, se anuló la nota de crédito ${numero} ` +
        `por ${datos.nota.monto} ${moneda} sobre la factura ${factura}. ` +
        `Motivo: ${datos.motivoAnulacion}. Saldo pendiente: ${saldo}.`,
    };
  }

  private async transaccion<T>(trabajo: (manager: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction('READ COMMITTED', trabajo);
    } catch (error) {
      const code = this.codigoPostgres(error);
      if (code === '23514' || code === '23505') {
        throw new ConflictException(
          'La operación fue rechazada para no dejar el saldo de la factura inconsistente',
        );
      }
      if (code === '40P01' || code === '40001') {
        throw new ConflictException(
          'Otro proceso actualizó la factura al mismo tiempo. Intenta de nuevo.',
        );
      }
      throw error;
    }
  }

  private codigoPostgres(error: unknown) {
    if (error instanceof QueryFailedError) {
      return (error.driverError as { code?: string } | undefined)?.code;
    }
    return undefined;
  }

  private buscarNota(id: string, tenantId: string) {
    return this.notasRepo
      .findOne({ where: { id, tenantId }, relations: { factura: true } })
      .then((nota) => {
        if (!nota) throw new NotFoundException('Nota de crédito no encontrada');
        return nota;
      });
  }

  private buscarHistorial(notaCreditoId: string, tenantId: string) {
    return this.historialRepo.find({
      where: { notaCreditoId, tenantId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  private buscarHistorialCon(manager: EntityManager, notaCreditoId: string, tenantId: string) {
    return manager.find(NotaCreditoHistorial, {
      where: { notaCreditoId, tenantId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  private presentarMutacion(resultado: {
    nota: NotaCredito;
    factura: Factura;
    historial: NotaCreditoHistorial[];
    notificacion: Notificacion;
  }) {
    return {
      nota: this.presentarNota(resultado.nota, resultado.factura),
      historial: resultado.historial.map(this.presentarEvento),
      notificacion: this.presentarAviso(resultado.notificacion),
    };
  }

  private presentarNota = (nota: NotaCredito, factura: Factura) => ({
    id: nota.id,
    numero: nota.numero,
    tenantId: nota.tenantId,
    facturaId: nota.facturaId,
    monto: nota.monto,
    motivo: nota.motivo,
    estado: nota.estado,
    clienteNombre: nota.clienteNombre,
    clienteEmail: nota.clienteEmail,
    usuarioId: nota.usuarioId,
    createdAt: nota.createdAt,
    updatedAt: nota.updatedAt,
    factura: {
      id: factura.id,
      numeroFactura: factura.numeroFactura,
      montoTotal: factura.montoTotal,
      saldoPendiente: factura.saldoPendiente,
      estado: factura.estado,
      moneda: factura.moneda.trim(),
    },
  });

  private presentarEvento = (evento: NotaCreditoHistorial) => ({
    id: evento.id,
    accion: evento.accion,
    usuario: {
      id: evento.usuarioId,
      nombre: evento.usuarioNombre,
      email: evento.usuarioEmail,
    },
    montoAnterior: evento.montoAnterior,
    montoNuevo: evento.montoNuevo,
    saldoAnterior: evento.saldoAnterior,
    saldoNuevo: evento.saldoNuevo,
    motivoAnterior: evento.motivoAnterior,
    motivo: evento.motivo,
    createdAt: evento.createdAt,
  });

  private presentarAviso = (aviso: Notificacion) => ({
    id: aviso.id,
    tenantId: aviso.tenantId,
    facturaId: aviso.facturaId,
    notaCreditoId: aviso.notaCreditoId,
    clienteNombre: aviso.clienteNombre,
    clienteEmail: aviso.clienteEmail,
    tipo: aviso.tipo,
    asunto: aviso.asunto,
    mensaje: aviso.mensaje,
    createdAt: aviso.createdAt,
  });

  private registrarLogAviso(aviso: Notificacion) {
    this.logger.log(`Aviso registrado para ${aviso.clienteEmail}: ${aviso.asunto}`);
  }
}
