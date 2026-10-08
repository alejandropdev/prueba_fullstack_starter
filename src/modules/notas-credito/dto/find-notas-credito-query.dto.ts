import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { NotaCreditoEstado } from '../entities/nota-credito.entity';

export class FindNotasCreditoQueryDto {
  @IsOptional()
  @IsEnum(NotaCreditoEstado)
  estado?: NotaCreditoEstado;

  @IsOptional()
  @IsUUID('4')
  facturaId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(150)
  clienteEmail?: string;
}
