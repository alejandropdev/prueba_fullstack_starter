import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateNotaCreditoDto {
  @IsUUID()
  facturaId!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'monto debe ser un valor monetario válido con máximo 2 decimales',
  })
  monto!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  motivo!: string;
}
