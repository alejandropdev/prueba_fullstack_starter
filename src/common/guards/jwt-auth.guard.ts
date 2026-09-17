import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de autenticación ya listo. Aplícalo explícitamente con
 * @UseGuards(JwtAuthGuard) en cualquier controller nuevo que quieras proteger.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
