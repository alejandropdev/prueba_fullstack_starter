import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { NotificacionTipo } from '../entities/notificacion.entity';

export class FindNotificacionesQueryDto {
  @IsOptional()
  @IsEnum(NotificacionTipo)
  tipo?: NotificacionTipo;

  @IsOptional()
  @IsUUID('4')
  facturaId?: string;

  @IsOptional()
  @IsUUID('4')
  notaCreditoId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(150)
  clienteEmail?: string;
}
