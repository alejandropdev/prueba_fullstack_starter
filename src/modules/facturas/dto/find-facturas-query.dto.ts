import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FacturaEstado } from '../entities/factura.entity';

export class FindFacturasQueryDto {
  @ApiPropertyOptional({
    enum: FacturaEstado,
    description: 'Filtra facturas por estado',
  })
  @IsOptional()
  @IsEnum(FacturaEstado)
  estado?: FacturaEstado;
}
