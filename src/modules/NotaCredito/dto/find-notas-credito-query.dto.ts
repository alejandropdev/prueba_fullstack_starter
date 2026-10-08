import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { NotaCreditoEstado } from '../entities/nota-credito.entity';

export class FindNotasCreditoQueryDto {
  @IsOptional()
  @IsEnum(NotaCreditoEstado)
  estado?: NotaCreditoEstado;

  @IsOptional()
  @IsUUID()
  facturaId?: string;
}
