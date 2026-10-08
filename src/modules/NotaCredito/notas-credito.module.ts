import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from '../facturas/entities/factura.entity';
import { NotaCredito } from './entities/nota-credito.entity';
import { NotaCreditoAuditoria } from './entities/nota-credito-auditoria.entity';
import { NotasCreditoController } from './notas-credito.controller';
import { NotasCreditoNotificationService } from './notas-credito.notification.service';
import { NotasCreditoService } from './notas-credito.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Factura,
      NotaCredito,
      NotaCreditoAuditoria,
    ]),
  ],
  controllers: [NotasCreditoController],
  providers: [
    NotasCreditoService,
    NotasCreditoNotificationService,
  ],
  exports: [NotasCreditoService],
})
export class NotasCreditoModule {}
