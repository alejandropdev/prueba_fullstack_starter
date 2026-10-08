import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from '../facturas/entities/factura.entity';
import { NotaCredito } from './entities/nota-credito.entity';
import { NotaCreditoEvento } from './entities/nota-credito-evento.entity';
import { NotificacionOutbox } from './entities/notificacion-outbox.entity';
import { NotasCreditoController } from './notas-credito.controller';
import { NotasCreditoService } from './notas-credito.service';
import { LogNotificador, NOTIFICADOR } from './notificaciones/notificador.port';
import { OutboxDispatcherService } from './notificaciones/outbox-dispatcher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factura, NotaCredito, NotaCreditoEvento, NotificacionOutbox]),
  ],
  controllers: [NotasCreditoController],
  providers: [
    NotasCreditoService,
    OutboxDispatcherService,
    { provide: NOTIFICADOR, useClass: LogNotificador },
  ],
})
export class NotasCreditoModule {}
