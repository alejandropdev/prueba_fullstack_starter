import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AnularNotaCreditoDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(5, { message: 'motivo debe explicar la anulación (mínimo 5 caracteres)' })
  @MaxLength(500)
  motivo: string;
}
