import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { User } from '../modules/users/entities/user.entity';
import { Factura } from '../modules/facturas/entities/factura.entity';
import { NotaCredito } from '../modules/notas-credito/entities/nota-credito.entity';
import { NotaCreditoEvento } from '../modules/notas-credito/entities/nota-credito-evento.entity';
import { NotificacionOutbox } from '../modules/notas-credito/entities/notificacion-outbox.entity';

// DataSource compartido por el TypeORM CLI (migration:generate/run/revert)
// y por TypeOrmModule.forRootAsync en app.module.ts. synchronize queda en
// false a propósito: en un dominio de dinero el schema vive versionado en
// SQL/migraciones, nunca se autogenera.
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'aravia',
  password: process.env.DB_PASSWORD ?? 'aravia_dev_password',
  database: process.env.DB_NAME ?? 'aravia_prueba',
  entities: [Tenant, User, Factura, NotaCredito, NotaCreditoEvento, NotificacionOutbox],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
};

export default new DataSource(dataSourceOptions);
