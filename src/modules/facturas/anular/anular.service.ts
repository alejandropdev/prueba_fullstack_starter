import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Factura, FacturaEstado } from '../entities/factura.entity';

@Injectable()
export class AnularService {
  constructor(
    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,
  ) {}

  async anular(id: string, tenantId: string): Promise<{ mensaje: string }> {
    const factura = await this.facturasRepository.findOneBy({ id, tenantId });

    if (!factura) {
      throw new NotFoundException('Proceso de anulacion invalido');
    }

    if (factura.estado !== FacturaEstado.EMITIDA) {
      throw new BadRequestException('Factura no valida');
    }

    await this.facturasRepository.update(factura.id, {
      saldoPendiente: '0.00',
      estado: FacturaEstado.ANULADA,
    });

    return { mensaje: 'Factura anulada exitosamente' };
  }
}
