import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { NotaCreditoEstado } from '../entities/nota-credito.entity';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// El monto viaja como string con máximo 2 decimales. Se rechaza `number` y
// cualquier valor con más precisión: no se redondea de forma implícita.
const MONTO_REGEX = /^\d{1,12}(\.\d{1,2})?$/;
const MONTO_MENSAJE =
  'monto debe ser un string decimal positivo con máximo 2 decimales, ej. "1500.50"';

export class CrearNotaCreditoDto {
  @ApiProperty({
    example: '50750.50',
    description: 'String decimal positivo con máximo 2 decimales (no number)',
  })
  @IsString({ message: MONTO_MENSAJE })
  @Matches(MONTO_REGEX, { message: MONTO_MENSAJE })
  monto: string;

  @ApiProperty({ example: 'Devolución parcial de mercancía', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  motivo: string;
}

export class CorregirNotaCreditoDto {
  @ApiProperty({ example: '40000.25', description: 'Monto correcto de la nota' })
  @IsString({ message: MONTO_MENSAJE })
  @Matches(MONTO_REGEX, { message: MONTO_MENSAJE })
  monto: string;

  @ApiProperty({ example: 'El valor original estaba mal digitado', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  motivo: string;
}

export class AnularNotaCreditoDto {
  @ApiProperty({ example: 'Nota emitida por error', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  motivo: string;
}

export class FindNotasCreditoQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filtra por factura' })
  @IsOptional()
  @IsUUID()
  facturaId?: string;

  @ApiPropertyOptional({ enum: NotaCreditoEstado })
  @IsOptional()
  @IsEnum(NotaCreditoEstado)
  estado?: NotaCreditoEstado;
}
