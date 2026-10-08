import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nota } from '../notas/entities/nota.entity';
import { NotaCambio } from './entities/nota-cambio.entity';
import { NotasCambiosService } from './notas_cambios.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotaCambio, Nota])],
  providers: [NotasCambiosService],
  exports: [NotasCambiosService],
})
export class NotasCambiosModule {}
