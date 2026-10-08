import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from '../facturas/entities/factura.entity';
import { Nota } from './entities/nota.entity';
import { NotasController } from './notas.controller';
import { NotasService } from './notas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Nota, Factura])],
  controllers: [NotasController],
  providers: [NotasService],
  exports: [NotasService],
})
export class NotasModule {}
