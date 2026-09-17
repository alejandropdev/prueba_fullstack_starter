import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from '../entities/factura.entity';
import { EditarValorController } from './editar-valor.controller';
import { EditarValorService } from './editar-valor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Factura])],
  controllers: [EditarValorController],
  providers: [EditarValorService],
  exports: [EditarValorService],
})
export class EditarValorModule {}
