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

export enum FacturaEstado {
  EMITIDA = 'emitida',
  PAGADA = 'pagada',
  ANULADA = 'anulada',
}

@Entity('facturas')
export class Factura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'numero_factura', type: 'varchar', length: 30 })
  numeroFactura: string;

  // string a propósito: NUMERIC de Postgres llega como string vía TypeORM,
  // así evitamos errores de coma flotante de JS con dinero. No lo conviertas a number.
  @Column({ name: 'monto_total', type: 'numeric', precision: 14, scale: 2 })
  montoTotal: string;

  @Column({ name: 'saldo_pendiente', type: 'numeric', precision: 14, scale: 2 })
  saldoPendiente: string;

  @Column({ type: 'varchar', length: 20, default: FacturaEstado.EMITIDA })
  estado: FacturaEstado;

  @Column({ type: 'char', length: 3, default: 'COP' })
  moneda: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  concepto: string | null;

  @Column({ name: 'fecha_emision', type: 'date' })
  fechaEmision: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
