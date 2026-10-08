import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

const MONTO_REGEX = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateNotaCreditoDto {
  @IsUUID('4', { message: 'facturaId debe ser un UUID' })
  facturaId: string;

  @IsString({ message: 'monto debe enviarse como texto para no perder precisión' })
  @Matches(MONTO_REGEX, {
    message: 'monto debe ser positivo, con máximo 2 decimales y sin separadores de miles',
  })
  monto: string;

  @Transform(trim)
  @IsString()
  @MinLength(5, { message: 'motivo debe explicar el cambio (mínimo 5 caracteres)' })
  @MaxLength(500)
  motivo: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  clienteNombre: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'clienteEmail no es un correo válido' })
  @MaxLength(150)
  clienteEmail: string;
}
