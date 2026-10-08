import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { FacturaEstado } from '../entities/factura.entity';

export class FindFacturasQueryDto {
  @ApiPropertyOptional({ enum: FacturaEstado })
  @IsOptional()
  @IsEnum(FacturaEstado)
  estado?: FacturaEstado;
}
