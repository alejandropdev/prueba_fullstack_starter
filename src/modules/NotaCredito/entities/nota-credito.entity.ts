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
import { User } from '../../users/entities/user.entity';
import { Factura } from '../../facturas/entities/factura.entity';

export enum NotaCreditoEstado {
  EMITIDA = 'emitida',
  ANULADA = 'anulada',
}

@Entity('notas_credito')
export class NotaCredito {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'factura_id', type: 'uuid' })
  facturaId!: string;

  @ManyToOne(() => Factura, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'factura_id' })
  factura!: Factura;

  @Column({ name: 'numero_nota', type: 'varchar', length: 40 })
  numeroNota!: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  monto!: string;

  @Column({ type: 'varchar', length: 255 })
  motivo!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: NotaCreditoEstado.EMITIDA,
  })
  estado!: NotaCreditoEstado;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator!: User;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'updated_by' })
  updater!: User | null;

  @Column({ name: 'anulada_at', type: 'timestamptz', nullable: true })
  anuladaAt!: Date | null;

  @Column({ name: 'anulada_by', type: 'uuid', nullable: true })
  anuladaBy!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'anulada_by' })
  annuller!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
