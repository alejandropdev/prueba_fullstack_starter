import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Factura, FacturaEstado } from '../entities/factura.entity';
import { toMoney, subtractMoney, isGreaterThan } from '../../../common/utils/money.util';

@Injectable()
export class EditarValorService {
  constructor(
    @InjectRepository(Factura)
    private readonly facturasRepository: Repository<Factura>,
  ) {}

  async editarValor(
    id: string,
    tenantId: string,
    montoTotal: string,
  ): Promise<{ mensaje: string }> {
    const factura = await this.facturasRepository.findOneBy({ id, tenantId });

    if (!factura) {
      throw new NotFoundException('Proceso de modificacion invalido');
    }

    if (factura.estado !== FacturaEstado.EMITIDA) {
      throw new BadRequestException('Factura no valida');
    }

    const viejoMontoTotal = factura.montoTotal;
    const saldoPendiente = factura.saldoPendiente;

    let nuevoSaldoPendiente: string;

    if (toMoney(viejoMontoTotal).equals(toMoney(saldoPendiente))) {
      // No se ha realizado ningún pago: ambos campos se actualizan al nuevo monto
      nuevoSaldoPendiente = montoTotal;
    } else {
      // Ya existe un pago parcial: calcular el monto pagado y derivar el nuevo saldo
      const montoPagado = subtractMoney(viejoMontoTotal, saldoPendiente);
      nuevoSaldoPendiente = subtractMoney(montoTotal, montoPagado);

      if (isGreaterThan(montoPagado, montoTotal)) {
        throw new BadRequestException('El nuevo monto total no puede ser menor al monto ya pagado');
      }
    }

    await this.facturasRepository.update(factura.id, {
      montoTotal,
      saldoPendiente: nuevoSaldoPendiente,
    });

    return { mensaje: 'Factura modificada exitosamente' };
  }
}
