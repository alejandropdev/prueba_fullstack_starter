import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { FacturasModule } from './modules/facturas/facturas.module';
import { NotasCreditoModule } from './modules/notas-credito/notas-credito.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        ...dataSourceOptions,
        // Aplica las migraciones pendientes al arrancar (equivale a migration:run).
        migrationsRun: true,
        // Tolera que Nest arranque un poco antes que el healthcheck de Postgres.
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    AuthModule,
    UsersModule,
    TenantsModule,
    FacturasModule,
    NotasCreditoModule,
  ],
})
export class AppModule {}
