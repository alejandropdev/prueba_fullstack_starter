import { IsEnum, IsOptional } from 'class-validator';
import { FacturaEstado } from '../entities/factura.entity';

export class FindFacturasQueryDto {
  @IsOptional()
  @IsEnum(FacturaEstado)
  estado?: FacturaEstado;
}
