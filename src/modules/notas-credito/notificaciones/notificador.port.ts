import { Injectable, Logger } from '@nestjs/common';
import { NotificacionOutbox } from '../entities/notificacion-outbox.entity';

export const NOTIFICADOR = Symbol('NOTIFICADOR');

// Puerto de salida hacia el cliente final. Para enviar por correo/SMS basta
// con otra implementación; el resto del módulo no cambia.
export interface NotificadorPort {
  enviar(notificacion: NotificacionOutbox): Promise<void>;
}

// Adaptador de desarrollo: la factura aún no tiene datos de contacto del
// cliente final, así que el aviso se deja en el log.
@Injectable()
export class LogNotificador implements NotificadorPort {
  private readonly logger = new Logger('AvisoClienteFinal');

  async enviar(notificacion: NotificacionOutbox): Promise<void> {
    const p = notificacion.payload;
    this.logger.log(
      `[${notificacion.tipo}] tenant=${notificacion.tenantId} factura=${p.numeroFactura} ` +
        `nota=${p.numeroNotaCredito} monto=${p.monto} ${p.moneda} ` +
        `saldoPendiente=${p.saldoPendienteFactura} motivo="${p.motivo}"`,
    );
  }
}
