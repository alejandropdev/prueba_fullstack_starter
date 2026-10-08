import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Factura } from '../../facturas/entities/factura.entity';
import { User } from '../../users/entities/user.entity';

export enum NotaCreditoEstado {
  EMITIDA = 'emitida',
  ANULADA = 'anulada',
}

@Entity('notas_credito')
export class NotaCredito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'factura_id', type: 'uuid' })
  facturaId: string;

  @ManyToOne(() => Factura, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'factura_id' })
  factura: Factura;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @Column({ type: 'varchar', length: 30 })
  numero: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  monto: string;

  @Column({ type: 'varchar', length: 500 })
  motivo: string;

  @Column({ type: 'varchar', length: 20, default: NotaCreditoEstado.EMITIDA })
  estado: NotaCreditoEstado;

  @Column({ name: 'cliente_nombre', type: 'varchar', length: 150 })
  clienteNombre: string;

  @Column({ name: 'cliente_email', type: 'varchar', length: 150 })
  clienteEmail: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
