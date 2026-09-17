import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from '../entities/factura.entity';
import { AnularController } from './anular.controller';
import { AnularService } from './anular.service';

@Module({
  imports: [TypeOrmModule.forFeature([Factura])],
  controllers: [AnularController],
  providers: [AnularService],
  exports: [AnularService],
})
export class AnularModule {}
