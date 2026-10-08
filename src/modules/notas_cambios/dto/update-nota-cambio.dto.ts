import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateNotaCambioDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  campo?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nuevoValor?: string;
}
