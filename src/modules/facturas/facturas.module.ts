import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from './entities/factura.entity';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';
import { AnularModule } from './anular/anular.module';
import { EditarValorModule } from './editar-valor/editar-valor.module';

@Module({
  imports: [TypeOrmModule.forFeature([Factura]), AnularModule, EditarValorModule],
  controllers: [FacturasController],
  providers: [FacturasService],
  exports: [FacturasService],
})
export class FacturasModule {}
