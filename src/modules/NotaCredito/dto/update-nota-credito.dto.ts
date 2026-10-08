import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateNotaCreditoDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'monto debe ser un valor monetario válido con máximo 2 decimales',
  })
  monto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}
