import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from '../facturas/entities/factura.entity';
import { User } from '../users/entities/user.entity';
import { NotaCreditoHistorial } from './entities/nota-credito-historial.entity';
import { NotaCredito } from './entities/nota-credito.entity';
import { Notificacion } from './entities/notificacion.entity';
import { NotasCreditoController } from './notas-credito.controller';
import { NotasCreditoService } from './notas-credito.service';
import { NotificacionesController } from './notificaciones.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotaCredito, NotaCreditoHistorial, Notificacion, Factura, User]),
  ],
  controllers: [NotasCreditoController, NotificacionesController],
  providers: [NotasCreditoService],
})
export class NotasCreditoModule {}
