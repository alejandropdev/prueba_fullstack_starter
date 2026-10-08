import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const MONTO_REGEX = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;

export class CorregirNotaCreditoDto {
  @IsOptional()
  @IsString({ message: 'monto debe enviarse como texto para no perder precisión' })
  @Matches(MONTO_REGEX, {
    message: 'monto debe ser positivo, con máximo 2 decimales y sin separadores de miles',
  })
  monto?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(5, { message: 'motivo debe explicar el cambio (mínimo 5 caracteres)' })
  @MaxLength(500)
  motivo?: string;
}
