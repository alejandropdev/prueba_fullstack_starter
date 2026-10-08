import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { Factura } from '../facturas/entities/factura.entity';
import { CreateNotaDto } from './dto/create-nota.dto';
import { UpdateNotaDto } from './dto/update-nota.dto';
import { NotaCambio } from '../notas_cambios/entities/nota-cambio.entity';
import { NotaHistory } from '../notas_history/entities/nota-history.entity';
import { Nota } from './entities/nota.entity';

@Injectable()
export class NotasService {
  constructor(
    @InjectRepository(Nota)
    private readonly notasRepository: Repository<Nota>,
    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,
  ) {}

  findAll(): Promise<Nota[]> {
    return this.notasRepository.find({
      order: { id: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Nota> {
    const nota = await this.notasRepository.findOne({
      where: { id },
      relations: { notasCambios: true, notasHistory: true },
      order: { notasHistory: { creado: 'DESC' } },
    });

    if (!nota) {
      throw new NotFoundException('Nota no encontrada');
    }

    return nota;
  }

  async create(dto: CreateNotaDto): Promise<Nota> {
    return this.notasRepository.manager.transaction(async (manager) => {
      const nota = await manager.save(
        manager.create(Nota, {
          idFactura: dto.idFactura,
          corregir: dto.corregir ?? false,
          descripcion: dto.descripcion,
          cerrado: dto.cerrado ? new Date(dto.cerrado) : null,
        }),
      );

      const cambios = await manager.save(
        manager.create(
          NotaCambio,
          (dto.cambios ?? []).map((cambio) => ({
            idNota: nota.id,
            campo: cambio.campo,
            nuevoValor: cambio.nuevoValor,
          })),
        ),
      );

      const history = await manager.save(
        manager.create(NotaHistory, {
          idNota: nota.id,
          descripcion: this.buildCreateHistoryDescription(dto),
        }),
      );

      nota.notasCambios = cambios;
      nota.notasHistory = [history];

      return nota;
    });
  }

  private buildCreateHistoryDescription(dto: CreateNotaDto): string {
    const cambios = dto.cambios ?? [];
    const listaCambios = cambios.length
      ? cambios.map((c) => `- ${c.campo}: ${c.nuevoValor}`).join('\n')
      : '- (sin cambios)';

    return `Se creó una nota con los siguientes cambios:\n${listaCambios}\n\nDescripción: ${dto.descripcion}`;
  }

  async update(id: string, dto: UpdateNotaDto): Promise<Nota> {
    return this.notasRepository.manager.transaction(async (manager) => {
      const nota = await manager.findOne(Nota, { where: { id } });

      if (!nota) {
        throw new NotFoundException('Nota no encontrada');
      }

      if (dto.idFactura && dto.idFactura !== nota.idFactura) {
        nota.idFactura = dto.idFactura;
      }

      if (dto.corregir !== undefined) {
        nota.corregir = dto.corregir;
      }

      const descripcionEditada =
        dto.descripcion !== undefined && dto.descripcion !== nota.descripcion;

      if (dto.descripcion !== undefined) {
        nota.descripcion = dto.descripcion;
      }

      if (dto.cerrado !== undefined) {
        nota.cerrado = dto.cerrado ? new Date(dto.cerrado) : null;
      }

      const cambiosEditados: NotaCambio[] = [];

      for (const item of dto.cambios ?? []) {
        const cambio = await manager.findOne(NotaCambio, {
          where: { id: item.id, idNota: id },
        });

        if (!cambio) {
          throw new NotFoundException('Nota cambio no encontrada');
        }

        const campo = item.campo ?? cambio.campo;
        const nuevoValor = item.nuevoValor ?? cambio.nuevoValor;

        if (campo === cambio.campo && nuevoValor === cambio.nuevoValor) {
          continue;
        }

        cambio.campo = campo;
        cambio.nuevoValor = nuevoValor;
        cambiosEditados.push(await manager.save(cambio));
      }

      nota.updated = new Date();
      await manager.save(nota);

      if (descripcionEditada || cambiosEditados.length) {
        await manager.save(
          manager.create(NotaHistory, {
            idNota: id,
            descripcion: this.buildUpdateHistoryDescription(
              descripcionEditada ? nota.descripcion : null,
              cambiosEditados,
            ),
          }),
        );
      }

      return manager.findOneOrFail(Nota, {
        where: { id },
        relations: { notasCambios: true, notasHistory: true },
        order: { notasHistory: { creado: 'DESC' } },
      });
    });
  }

  private buildUpdateHistoryDescription(
    descripcion: string | null,
    cambios: NotaCambio[],
  ): string {
    const partes = ['Se editó la nota.'];

    if (cambios.length) {
      const lista = cambios.map((c) => `- ${c.campo}: ${c.nuevoValor}`).join('\n');
      partes.push(`Cambios editados:\n${lista}`);
    }

    if (descripcion !== null) {
      partes.push(`Descripción editada: ${descripcion}`);
    }

    return partes.join('\n\n');
  }

  private async assertFacturaBelongsToTenant(
    facturaId: string,
    tenantId: string,
  ): Promise<void> {
    const factura = await this.facturasRepository.findOneBy({
      id: facturaId,
      tenantId,
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }
  }
}
