import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditarValorDto {
  @ApiProperty({
    example: '1500000.00',
    description: 'Nuevo monto total de la factura (formato numérico con hasta 2 decimales)',
  })
  @IsString()
  @IsNotEmpty({ message: 'El monto total es obligatorio' })
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'El monto total debe ser un numero positivo con hasta 2 decimales',
  })
  monto_total: string;
}
