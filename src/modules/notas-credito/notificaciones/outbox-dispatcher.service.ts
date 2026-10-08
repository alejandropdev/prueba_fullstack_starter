import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificacionEstado, NotificacionOutbox } from '../entities/notificacion-outbox.entity';
import { NOTIFICADOR, NotificadorPort } from './notificador.port';

const INTERVALO_MS = 10_000;
const LOTE = 20;
const MAX_INTENTOS = 5;

// Envía los avisos encolados DESPUÉS del commit de la operación que los generó.
// Entrega "al menos una vez": si el envío falla se reintenta con backoff y tras
// MAX_INTENTOS queda `fallida`. Es un proceso de sistema, por eso es el único
// punto del módulo que no filtra por tenant.
@Injectable()
export class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(NOTIFICADOR) private readonly notificador: NotificadorPort,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.despacharSinEsperar(), INTERVALO_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // Para llamar justo después de un commit sin acoplar la respuesta HTTP al envío.
  despacharSinEsperar(): void {
    this.despacharPendientes().catch((error) =>
      this.logger.error(`Fallo despachando el outbox: ${error?.message ?? error}`),
    );
  }

  async despacharPendientes(): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      // SKIP LOCKED: varias instancias de la API pueden despachar a la vez sin
      // enviar dos veces la misma fila.
      const pendientes = await manager
        .getRepository(NotificacionOutbox)
        .createQueryBuilder('n')
        .where('n.estado = :estado', { estado: NotificacionEstado.PENDIENTE })
        .andWhere('n.proximo_intento_at <= now()')
        .orderBy('n.created_at', 'ASC')
        .limit(LOTE)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      for (const notificacion of pendientes) {
        try {
          await this.notificador.enviar(notificacion);
          await manager.update(NotificacionOutbox, notificacion.id, {
            estado: NotificacionEstado.ENVIADA,
            intentos: notificacion.intentos + 1,
            enviadaAt: new Date(),
            ultimoError: null,
          });
        } catch (error) {
          const intentos = notificacion.intentos + 1;
          await manager.update(NotificacionOutbox, notificacion.id, {
            estado:
              intentos >= MAX_INTENTOS ? NotificacionEstado.FALLIDA : NotificacionEstado.PENDIENTE,
            intentos,
            proximoIntentoAt: new Date(Date.now() + 2 ** intentos * 30_000),
            ultimoError: String(error?.message ?? error),
          });
        }
      }

      return pendientes.length;
    });
  }
}
