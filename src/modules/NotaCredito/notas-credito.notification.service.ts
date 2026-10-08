import { Injectable, Logger } from '@nestjs/common';

interface NotaCreditoNotification {
  numeroNota: string;
  facturaId: string;
  monto: string;
}

@Injectable()
export class NotasCreditoNotificationService {
  private readonly logger = new Logger(
    NotasCreditoNotificationService.name,
  );

  async notifyIssued(data: NotaCreditoNotification): Promise<void> {
    this.logger.log(
      `[NOTIFICACIÓN CLIENTE] Nota ${data.numeroNota} emitida | ` +
        `Factura ${data.facturaId} | Monto ${data.monto} | Resultado SUCCESS`,
    );
  }

  async notifyAnnulled(data: NotaCreditoNotification): Promise<void> {
    this.logger.log(
      `[NOTIFICACIÓN CLIENTE] Nota ${data.numeroNota} anulada | ` +
        `Factura ${data.facturaId} | Monto ${data.monto} | Resultado SUCCESS`,
    );
  }
}
