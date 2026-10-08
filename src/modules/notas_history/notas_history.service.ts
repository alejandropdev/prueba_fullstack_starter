import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nota } from '../notas/entities/nota.entity';
import { CreateNotaHistoryDto } from './dto/create-nota-history.dto';
import { NotaHistory } from './entities/nota-history.entity';

@Injectable()
export class NotasHistoryService {
  constructor(
    @InjectRepository(NotaHistory)
    private readonly notasHistoryRepository: Repository<NotaHistory>,
    @InjectRepository(Nota)
    private readonly notasRepository: Repository<Nota>,
  ) {}

  findAllByNotaForTenant(idNota: string, tenantId: string): Promise<NotaHistory[]> {
    return this.notasHistoryRepository.find({
      where: { idNota, nota: { factura: { tenantId } } },
      order: { creado: 'DESC' },
    });
  }

  async createForNota(
    idNota: string,
    tenantId: string,
    dto: CreateNotaHistoryDto,
  ): Promise<NotaHistory> {
    const nota = await this.notasRepository.findOne({
      where: { id: idNota, factura: { tenantId } },
    });

    if (!nota) {
      throw new NotFoundException('Nota no encontrada');
    }

    const history = this.notasHistoryRepository.create({
      idNota,
      descripcion: dto.descripcion,
      ...(dto.creado ? { creado: new Date(dto.creado) } : {}),
    });

    return this.notasHistoryRepository.save(history);
  }
}
