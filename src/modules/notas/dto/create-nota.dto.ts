import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateNotaCambioDto } from '../../notas_cambios/dto/create-nota-cambio.dto';

export class CreateNotaDto {
  @IsUUID()
  idFactura: string;

  @IsOptional()
  @IsBoolean()
  corregir?: boolean;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  @IsISO8601()
  cerrado?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNotaCambioDto)
  cambios?: CreateNotaCambioDto[];
}
