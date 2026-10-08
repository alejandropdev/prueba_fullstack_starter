import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { addMoney, isGreaterThan, subtractMoney, toMoney } from '../../common/utils/money.util';
import { Factura, FacturaEstado } from '../facturas/entities/factura.entity';
import {
  AnularNotaCreditoDto,
  CorregirNotaCreditoDto,
  CrearNotaCreditoDto,
  FindNotasCreditoQueryDto,
} from './dto/nota-credito.dto';
import { NotaCredito, NotaCreditoEstado } from './entities/nota-credito.entity';
import { NotaCreditoEvento, NotaCreditoEventoTipo } from './entities/nota-credito-evento.entity';
import { NotificacionOutbox, NotificacionTipo } from './entities/notificacion-outbox.entity';
import { OutboxDispatcherService } from './notificaciones/outbox-dispatcher.service';

const IDEMPOTENCY_KEY_MAX = 100;

interface DatosEmision {
  monto: string;
  motivo: string;
  reemplazaAId?: string;
  idempotencyKey?: string;
}

export interface ResultadoNotaCredito {
  notaCredito: NotaCredito;
  factura: Pick<Factura, 'id' | 'numeroFactura' | 'saldoPendiente' | 'estado'>;
}

@Injectable()
export class NotasCreditoService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly outboxDispatcher: OutboxDispatcherService,
  ) {}

  // ---------------------------------------------------------------- consultas

  findAllForTenant(tenantId: string, query: FindNotasCreditoQueryDto): Promise<NotaCredito[]> {
    return this.dataSource.getRepository(NotaCredito).find({
      where: {
        tenantId,
        ...(query.facturaId ? { facturaId: query.facturaId } : {}),
        ...(query.estado ? { estado: query.estado } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForTenant(id: string, tenantId: string): Promise<NotaCredito> {
    const nota = await this.dataSource.getRepository(NotaCredito).findOneBy({ id, tenantId });
    if (!nota) {
      throw new NotFoundException('Nota de crédito no encontrada');
    }
    return nota;
  }

  async historialDeNota(id: string, tenantId: string): Promise<NotaCreditoEvento[]> {
    await this.findOneForTenant(id, tenantId);
    return this.dataSource.getRepository(NotaCreditoEvento).find({
      where: { notaCreditoId: id, tenantId },
      order: { secuencia: 'ASC' },
    });
  }

  // Todos los movimientos de saldo que las notas de crédito causaron en una factura.
  async historialDeFactura(facturaId: string, tenantId: string): Promise<NotaCreditoEvento[]> {
    const existe = await this.dataSource
      .getRepository(Factura)
      .existsBy({ id: facturaId, tenantId });
    if (!existe) {
      throw new NotFoundException('Factura no encontrada');
    }
    return this.dataSource.getRepository(NotaCreditoEvento).find({
      where: { facturaId, tenantId },
      order: { secuencia: 'ASC' },
    });
  }

  // -------------------------------------------------------------- operaciones

  async emitir(
    user: AuthenticatedUser,
    facturaId: string,
    dto: CrearNotaCreditoDto,
    idempotencyKey?: string,
  ): Promise<ResultadoNotaCredito> {
    const key = this.normalizarIdempotencyKey(idempotencyKey);

    try {
      const resultado = await this.dataSource.transaction(async (manager) => {
        const factura = await this.bloquearFactura(manager, facturaId, user.tenantId);

        // Con la factura ya bloqueada, un reintento con la misma llave encuentra
        // la nota creada por la solicitud original y no vuelve a descontar.
        if (key) {
          const previa = await manager.findOneBy(NotaCredito, {
            tenantId: user.tenantId,
            idempotencyKey: key,
          });
          if (previa) {
            this.assertMismaSolicitud(previa, facturaId, dto);
            return this.resultado(previa, factura);
          }
        }

        const nota = await this.aplicarEmision(manager, factura, user, {
          monto: dto.monto,
          motivo: dto.motivo,
          idempotencyKey: key,
        });
        return this.resultado(nota, factura);
      });

      this.outboxDispatcher.despacharSinEsperar();
      return resultado;
    } catch (error) {
      // Misma llave usada a la vez sobre otra factura: la BD lo impide.
      if (esViolacionUnica(error, 'uq_nc_idempotency')) {
        throw new ConflictException('Idempotency-Key ya fue usada en otra solicitud');
      }
      throw error;
    }
  }

  async anular(
    user: AuthenticatedUser,
    id: string,
    dto: AnularNotaCreditoDto,
  ): Promise<ResultadoNotaCredito> {
    // Lectura sin bloqueo, solo para saber qué factura bloquear.
    const { facturaId } = await this.findOneForTenant(id, user.tenantId);

    const resultado = await this.dataSource.transaction(async (manager) => {
      const factura = await this.bloquearFactura(manager, facturaId, user.tenantId);
      const nota = await this.bloquearNota(manager, id, user.tenantId);
      await this.aplicarAnulacion(manager, factura, nota, user, dto.motivo);
      return this.resultado(nota, factura);
    });

    this.outboxDispatcher.despacharSinEsperar();
    return resultado;
  }

  // Corregir = anular la nota original y emitir una nueva enlazada a ella, en
  // una sola transacción: o quedan los dos movimientos o no queda ninguno.
  async corregir(
    user: AuthenticatedUser,
    id: string,
    dto: CorregirNotaCreditoDto,
  ): Promise<ResultadoNotaCredito & { notaAnulada: NotaCredito }> {
    const { facturaId } = await this.findOneForTenant(id, user.tenantId);

    const resultado = await this.dataSource.transaction(async (manager) => {
      const factura = await this.bloquearFactura(manager, facturaId, user.tenantId);
      const original = await this.bloquearNota(manager, id, user.tenantId);

      await this.aplicarAnulacion(
        manager,
        factura,
        original,
        user,
        `Corrección: ${dto.motivo}`.slice(0, 255),
      );
      const nueva = await this.aplicarEmision(manager, factura, user, {
        monto: dto.monto,
        motivo: dto.motivo,
        reemplazaAId: original.id,
      });

      return { ...this.resultado(nueva, factura), notaAnulada: original };
    });

    this.outboxDispatcher.despacharSinEsperar();
    return resultado;
  }

  // ------------------------------------------- pasos dentro de la transacción

  // SELECT ... FOR UPDATE filtrando por tenant. Toda operación que mueve el
  // saldo de una factura pasa primero por aquí, así las solicitudes simultáneas
  // sobre la misma factura se ejecutan de una en una y cada una valida contra
  // el saldo que dejó la anterior.
  private async bloquearFactura(
    manager: EntityManager,
    facturaId: string,
    tenantId: string,
  ): Promise<Factura> {
    const factura = await manager.findOne(Factura, {
      where: { id: facturaId, tenantId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }
    return factura;
  }

  // Siempre después de bloquearFactura (orden de bloqueo fijo: factura → nota).
  private async bloquearNota(
    manager: EntityManager,
    id: string,
    tenantId: string,
  ): Promise<NotaCredito> {
    const nota = await manager.findOne(NotaCredito, {
      where: { id, tenantId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!nota) {
      throw new NotFoundException('Nota de crédito no encontrada');
    }
    return nota;
  }

  private async aplicarEmision(
    manager: EntityManager,
    factura: Factura,
    user: AuthenticatedUser,
    datos: DatosEmision,
  ): Promise<NotaCredito> {
    if (factura.estado !== FacturaEstado.EMITIDA) {
      throw new ConflictException(
        `La factura está ${factura.estado}: solo se emiten notas de crédito sobre facturas emitidas`,
      );
    }
    if (!toMoney(datos.monto).greaterThan(0)) {
      throw new BadRequestException('monto debe ser mayor que 0');
    }
    if (isGreaterThan(datos.monto, factura.saldoPendiente)) {
      throw new UnprocessableEntityException(
        `El monto (${toMoney(datos.monto).toFixed(2)}) excede el saldo pendiente de la factura (${factura.saldoPendiente})`,
      );
    }

    const nota = await manager.save(
      manager.create(NotaCredito, {
        tenantId: user.tenantId,
        facturaId: factura.id,
        numero: await this.siguienteNumero(manager, user.tenantId),
        monto: toMoney(datos.monto).toFixed(2),
        moneda: factura.moneda,
        estado: NotaCreditoEstado.EMITIDA,
        motivo: datos.motivo,
        reemplazaAId: datos.reemplazaAId ?? null,
        idempotencyKey: datos.idempotencyKey ?? null,
        creadaPor: user.userId,
        anuladaPor: null,
        anuladaAt: null,
        motivoAnulacion: null,
      }),
    );

    const saldoDespues = subtractMoney(factura.saldoPendiente, nota.monto);
    const estadoDespues = await this.estadoFacturaTrasEmitir(manager, factura, saldoDespues);

    await this.registrarMovimiento(manager, factura, nota, user, {
      tipo: NotaCreditoEventoTipo.EMITIDA,
      motivo: datos.motivo,
      saldoDespues,
      estadoDespues,
    });
    return nota;
  }

  private async aplicarAnulacion(
    manager: EntityManager,
    factura: Factura,
    nota: NotaCredito,
    user: AuthenticatedUser,
    motivo: string,
  ): Promise<void> {
    if (nota.estado !== NotaCreditoEstado.EMITIDA) {
      throw new ConflictException('La nota de crédito ya está anulada');
    }

    const saldoDespues = addMoney(factura.saldoPendiente, nota.monto);
    if (isGreaterThan(saldoDespues, factura.montoTotal)) {
      throw new ConflictException(
        'Anular esta nota dejaría el saldo por encima del total de la factura',
      );
    }

    nota.estado = NotaCreditoEstado.ANULADA;
    nota.anuladaPor = user.userId;
    nota.anuladaAt = new Date();
    nota.motivoAnulacion = motivo;
    await manager.update(
      NotaCredito,
      { id: nota.id, tenantId: user.tenantId },
      {
        estado: nota.estado,
        anuladaPor: nota.anuladaPor,
        anuladaAt: nota.anuladaAt,
        motivoAnulacion: nota.motivoAnulacion,
      },
    );

    // El saldo vuelve a ser > 0, así que la factura queda de nuevo por cobrar.
    await this.registrarMovimiento(manager, factura, nota, user, {
      tipo: NotaCreditoEventoTipo.ANULADA,
      motivo,
      saldoDespues,
      estadoDespues: FacturaEstado.EMITIDA,
    });
  }

  // Actualiza el saldo, deja el evento de trazabilidad y encola el aviso al
  // cliente final. Las tres escrituras van en la transacción del llamador.
  private async registrarMovimiento(
    manager: EntityManager,
    factura: Factura,
    nota: NotaCredito,
    user: AuthenticatedUser,
    movimiento: {
      tipo: NotaCreditoEventoTipo;
      motivo: string;
      saldoDespues: string;
      estadoDespues: FacturaEstado;
    },
  ): Promise<void> {
    const saldoAntes = factura.saldoPendiente;
    const estadoAntes = factura.estado;

    await manager.update(
      Factura,
      { id: factura.id, tenantId: user.tenantId },
      { saldoPendiente: movimiento.saldoDespues, estado: movimiento.estadoDespues },
    );
    factura.saldoPendiente = movimiento.saldoDespues;
    factura.estado = movimiento.estadoDespues;

    const evento = await manager.save(
      manager.create(NotaCreditoEvento, {
        tenantId: user.tenantId,
        notaCreditoId: nota.id,
        facturaId: factura.id,
        tipo: movimiento.tipo,
        actorId: user.userId,
        monto: nota.monto,
        saldoAntes,
        saldoDespues: movimiento.saldoDespues,
        estadoFacturaAntes: estadoAntes,
        estadoFacturaDespues: movimiento.estadoDespues,
        motivo: movimiento.motivo,
      }),
    );

    await manager.insert(NotificacionOutbox, {
      tenantId: user.tenantId,
      eventoId: evento.id,
      tipo:
        movimiento.tipo === NotaCreditoEventoTipo.EMITIDA
          ? NotificacionTipo.NOTA_CREDITO_EMITIDA
          : NotificacionTipo.NOTA_CREDITO_ANULADA,
      payload: {
        notaCreditoId: nota.id,
        numeroNotaCredito: nota.numero,
        facturaId: factura.id,
        numeroFactura: factura.numeroFactura,
        monto: nota.monto,
        moneda: nota.moneda,
        motivo: movimiento.motivo,
        saldoPendienteFactura: movimiento.saldoDespues,
      },
    });
  }

  // `estado` de factura solo admite emitida/pagada/anulada. Con saldo en 0:
  // anulada si las notas vigentes cubren todo el valor de la factura, pagada
  // (saldada) si parte se cubrió con pagos.
  private async estadoFacturaTrasEmitir(
    manager: EntityManager,
    factura: Factura,
    saldoDespues: string,
  ): Promise<FacturaEstado> {
    if (!toMoney(saldoDespues).isZero()) {
      return FacturaEstado.EMITIDA;
    }
    const suma = await manager
      .createQueryBuilder(NotaCredito, 'n')
      .select('COALESCE(SUM(n.monto), 0)', 'total')
      .where('n.tenant_id = :tenantId', { tenantId: factura.tenantId })
      .andWhere('n.factura_id = :facturaId', { facturaId: factura.id })
      .andWhere('n.estado = :estado', { estado: NotaCreditoEstado.EMITIDA })
      .getRawOne<{ total: string }>();

    return toMoney(suma?.total ?? '0').equals(toMoney(factura.montoTotal))
      ? FacturaEstado.ANULADA
      : FacturaEstado.PAGADA;
  }

  private async siguienteNumero(manager: EntityManager, tenantId: string): Promise<string> {
    const [{ ultimo }] = await manager.query(
      `INSERT INTO nota_credito_consecutivos (tenant_id, ultimo) VALUES ($1, 1)
       ON CONFLICT (tenant_id) DO UPDATE SET ultimo = nota_credito_consecutivos.ultimo + 1
       RETURNING ultimo`,
      [tenantId],
    );
    return `NC-${String(ultimo).padStart(6, '0')}`;
  }

  // ------------------------------------------------------------------ helpers

  private normalizarIdempotencyKey(valor?: string): string | undefined {
    const key = valor?.trim();
    if (!key) return undefined;
    if (key.length > IDEMPOTENCY_KEY_MAX) {
      throw new BadRequestException(
        `Idempotency-Key admite máximo ${IDEMPOTENCY_KEY_MAX} caracteres`,
      );
    }
    return key;
  }

  private assertMismaSolicitud(previa: NotaCredito, facturaId: string, dto: CrearNotaCreditoDto) {
    const igual =
      previa.facturaId === facturaId &&
      toMoney(previa.monto).equals(toMoney(dto.monto)) &&
      previa.motivo === dto.motivo;
    if (!igual) {
      throw new ConflictException('Idempotency-Key ya fue usada con un contenido distinto');
    }
  }

  private resultado(notaCredito: NotaCredito, factura: Factura): ResultadoNotaCredito {
    return {
      notaCredito,
      factura: {
        id: factura.id,
        numeroFactura: factura.numeroFactura,
        saldoPendiente: factura.saldoPendiente,
        estado: factura.estado,
      },
    };
  }
}

function esViolacionUnica(error: unknown, constraint: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string; constraint?: string };
  return driverError?.code === '23505' && driverError?.constraint === constraint;
}
