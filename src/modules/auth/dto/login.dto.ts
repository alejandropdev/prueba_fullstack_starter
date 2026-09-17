import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'ana.gomez@elroble.test',
    description: 'Email del usuario registrado',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (igual para todos los usuarios de ejemplo)',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
