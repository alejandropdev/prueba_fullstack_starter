import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nota } from '../notas/entities/nota.entity';
import { NotaHistory } from './entities/nota-history.entity';
import { NotasHistoryService } from './notas_history.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotaHistory, Nota])],
  providers: [NotasHistoryService],
  exports: [NotasHistoryService],
})
export class NotasHistoryModule {}
