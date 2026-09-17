import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

// Sin controller público a propósito: por ahora solo lo consume AuthService
// para el login. Si necesitas exponer datos de usuario, agrega un endpoint
// scopeado por tenant siguiendo el mismo patrón que FacturasService.
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }
}
