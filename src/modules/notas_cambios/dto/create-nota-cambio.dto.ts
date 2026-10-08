import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNotaCambioDto {
  @IsString()
  @IsNotEmpty()
  campo: string;

  @IsString()
  @IsNotEmpty()
  nuevoValor: string;
}
