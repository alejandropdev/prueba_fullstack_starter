import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nota } from '../notas/entities/nota.entity';
import { CreateNotaCambioDto } from './dto/create-nota-cambio.dto';
import { UpdateNotaCambioDto } from './dto/update-nota-cambio.dto';
import { NotaCambio } from './entities/nota-cambio.entity';

@Injectable()
export class NotasCambiosService {
  constructor(
    @InjectRepository(NotaCambio)
    private readonly notasCambiosRepository: Repository<NotaCambio>,
    @InjectRepository(Nota)
    private readonly notasRepository: Repository<Nota>,
  ) {}

  findAllByNotaForTenant(idNota: string, tenantId: string): Promise<NotaCambio[]> {
    return this.notasCambiosRepository.find({
      where: { idNota, nota: { factura: { tenantId } } },
      order: { id: 'ASC' },
    });
  }

  async createManyForNota(
    idNota: string,
    tenantId: string,
    items: CreateNotaCambioDto[],
  ): Promise<NotaCambio[]> {
    await this.assertNotaBelongsToTenant(idNota, tenantId);

    const cambios = this.notasCambiosRepository.create(
      items.map((item) => ({
        idNota,
        campo: item.campo,
        nuevoValor: item.nuevoValor,
      })),
    );

    return this.notasCambiosRepository.save(cambios);
  }

  async updateManyForTenant(
    tenantId: string,
    items: UpdateNotaCambioDto[],
  ): Promise<NotaCambio[]> {
    return this.notasCambiosRepository.manager.transaction(async (manager) => {
      const actualizados: NotaCambio[] = [];

      for (const item of items) {
        const cambio = await manager.findOne(NotaCambio, {
          where: { id: item.id, nota: { factura: { tenantId } } },
        });

        if (!cambio) {
          throw new NotFoundException('Nota cambio no encontrada');
        }

        if (item.campo !== undefined) {
          cambio.campo = item.campo;
        }

        if (item.nuevoValor !== undefined) {
          cambio.nuevoValor = item.nuevoValor;
        }

        actualizados.push(await manager.save(cambio));
      }

      return actualizados;
    });
  }

  private async assertNotaBelongsToTenant(idNota: string, tenantId: string): Promise<void> {
    const nota = await this.notasRepository.findOne({
      where: { id: idNota, factura: { tenantId } },
    });

    if (!nota) {
      throw new NotFoundException('Nota no encontrada');
    }
  }
}
