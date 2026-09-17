import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum FacturaEstado {
  EMITIDA = 'emitida',
  PAGADA = 'pagada',
  ANULADA = 'anulada',
}

@Entity('facturas')
export class Factura {
  @ApiProperty({ example: '0780ada5-1a6c-4b8e-93c7-9c2f7aa3c4d1' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '5e1c9c9e-6f1e-4e2b-9d77-3f0cc2e7be41' })
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ApiHideProperty()
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ApiProperty({ example: 'FAC-2024-0001', description: 'Número único por tenant' })
  @Column({ name: 'numero_factura', type: 'varchar', length: 30 })
  numeroFactura: string;

  // string a propósito: NUMERIC de Postgres llega como string vía TypeORM,
  // así evitamos errores de coma flotante de JS con dinero. No lo conviertas a number.
  @ApiProperty({
    example: '1250000.50',
    description: 'Monto total en string (NUMERIC de Postgres) para preservar la precisión exacta',
  })
  @Column({ name: 'monto_total', type: 'numeric', precision: 14, scale: 2 })
  montoTotal: string;

  @ApiProperty({
    example: '1250000.50',
    description: 'Saldo pendiente en string (NUMERIC). Siempre <= monto_total',
  })
  @Column({ name: 'saldo_pendiente', type: 'numeric', precision: 14, scale: 2 })
  saldoPendiente: string;

  @ApiProperty({ enum: FacturaEstado, example: FacturaEstado.EMITIDA })
  @Column({ type: 'varchar', length: 20, default: FacturaEstado.EMITIDA })
  estado: FacturaEstado;

  @ApiProperty({ example: 'COP', description: 'Código de moneda ISO 4217' })
  @Column({ type: 'char', length: 3, default: 'COP' })
  moneda: string;

  @ApiProperty({ example: 'Venta de mercancía del mes', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  concepto: string | null;

  @ApiProperty({ example: '2024-01-15' })
  @Column({ name: 'fecha_emision', type: 'date' })
  fechaEmision: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
