import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Factura, FacturaEstado } from './entities/factura.entity';

@Injectable()
export class FacturasService {
  constructor(
    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,
  ) {}

  // Patrón de aislamiento multi-tenant a replicar en cualquier endpoint nuevo:
  // el tenantId SIEMPRE va en el where, nunca se consulta solo por id.
  findAllForTenant(tenantId: string, estado?: FacturaEstado): Promise<Factura[]> {
    return this.facturasRepository.find({
      where: estado ? { tenantId, estado } : { tenantId },
      order: { fechaEmision: 'DESC' },
    });
  }

  async findOneForTenant(id: string, tenantId: string): Promise<Factura> {
    const factura = await this.facturasRepository.findOneBy({ id, tenantId });

    // 404 (no 403) a propósito: si el id existe pero pertenece a otro tenant,
    // no queremos confirmarle a quien pregunta que la factura existe.
    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    return factura;
  }
}
