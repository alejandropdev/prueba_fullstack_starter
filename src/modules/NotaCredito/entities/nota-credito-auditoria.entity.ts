import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Factura } from '../../facturas/entities/factura.entity';
import { NotaCredito } from './nota-credito.entity';

export enum NotaCreditoAuditoriaAccion {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  ANNUL = 'ANNUL',
}

@Entity('nota_credito_auditoria')
export class NotaCreditoAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'nota_credito_id', type: 'uuid' })
  notaCreditoId!: string;

  @ManyToOne(() => NotaCredito, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nota_credito_id' })
  notaCredito!: NotaCredito;

  @Column({ name: 'factura_id', type: 'uuid' })
  facturaId!: string;

  @ManyToOne(() => Factura, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'factura_id' })
  factura!: Factura;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 20 })
  accion!: NotaCreditoAuditoriaAccion;

  @Column({
    name: 'monto_anterior',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  montoAnterior!: string | null;

  @Column({
    name: 'monto_nuevo',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  montoNuevo!: string | null;

  @Column({
    name: 'saldo_anterior',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  saldoAnterior!: string | null;

  @Column({
    name: 'saldo_nuevo',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  saldoNuevo!: string | null;

  @Column({
    name: 'estado_anterior',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  estadoAnterior!: string | null;

  @Column({
    name: 'estado_nuevo',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  estadoNuevo!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'SUCCESS',
  })
  resultado!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
