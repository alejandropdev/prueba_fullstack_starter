import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotaCredito } from './nota-credito.entity';

export enum NotaCreditoAccion {
  EMITIDA = 'emitida',
  CORREGIDA = 'corregida',
  ANULADA = 'anulada',
}

@Entity('notas_credito_historial')
export class NotaCreditoHistorial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'nota_credito_id', type: 'uuid' })
  notaCreditoId: string;

  @ManyToOne(() => NotaCredito, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nota_credito_id' })
  notaCredito: NotaCredito;

  @Column({ name: 'factura_id', type: 'uuid' })
  facturaId: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Column({ name: 'usuario_nombre', type: 'varchar', length: 150 })
  usuarioNombre: string;

  @Column({ name: 'usuario_email', type: 'varchar', length: 150 })
  usuarioEmail: string;

  @Column({ type: 'varchar', length: 20 })
  accion: NotaCreditoAccion;

  @Column({ name: 'monto_anterior', type: 'numeric', precision: 14, scale: 2, nullable: true })
  montoAnterior: string | null;

  @Column({ name: 'monto_nuevo', type: 'numeric', precision: 14, scale: 2, nullable: true })
  montoNuevo: string | null;

  @Column({ name: 'saldo_anterior', type: 'numeric', precision: 14, scale: 2 })
  saldoAnterior: string;

  @Column({ name: 'saldo_nuevo', type: 'numeric', precision: 14, scale: 2 })
  saldoNuevo: string;

  @Column({ name: 'motivo_anterior', type: 'varchar', length: 500, nullable: true })
  motivoAnterior: string | null;

  @Column({ type: 'varchar', length: 500 })
  motivo: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
