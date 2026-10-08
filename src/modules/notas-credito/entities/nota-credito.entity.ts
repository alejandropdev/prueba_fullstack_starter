import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum NotaCreditoEstado {
  EMITIDA = 'emitida',
  ANULADA = 'anulada',
}

// Una nota de crédito es inmutable: lo único que cambia tras emitirla es su
// paso a `anulada` (una sola vez). Corregir = anular + emitir otra enlazada
// con `reemplazaAId`.
@Entity('notas_credito')
export class NotaCredito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'factura_id', type: 'uuid' })
  facturaId: string;

  @Column({ type: 'varchar', length: 30 })
  numero: string;

  // string a propósito, igual que en Factura: nunca convertir a number.
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  monto: string;

  @Column({ type: 'char', length: 3 })
  moneda: string;

  @Column({ type: 'varchar', length: 20, default: NotaCreditoEstado.EMITIDA })
  estado: NotaCreditoEstado;

  @Column({ type: 'varchar', length: 255 })
  motivo: string;

  @Column({ name: 'reemplaza_a_id', type: 'uuid', nullable: true })
  reemplazaAId: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
  idempotencyKey: string | null;

  @Column({ name: 'creada_por', type: 'uuid' })
  creadaPor: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'anulada_por', type: 'uuid', nullable: true })
  anuladaPor: string | null;

  @Column({ name: 'anulada_at', type: 'timestamptz', nullable: true })
  anuladaAt: Date | null;

  @Column({ name: 'motivo_anulacion', type: 'varchar', length: 255, nullable: true })
  motivoAnulacion: string | null;
}
