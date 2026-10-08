import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { UpdateNotaCambioDto } from '../../notas_cambios/dto/update-nota-cambio.dto';

export class UpdateNotaDto {
  @IsOptional()
  @IsUUID()
  idFactura?: string;

  @IsOptional()
  @IsBoolean()
  corregir?: boolean;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsISO8601()
  cerrado?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateNotaCambioDto)
  cambios?: UpdateNotaCambioDto[];
}
