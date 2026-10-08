import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotaHistoryDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  @IsISO8601()
  creado?: string;
}
