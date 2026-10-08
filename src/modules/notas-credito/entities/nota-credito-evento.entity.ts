import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { FacturaEstado } from '../../facturas/entities/factura.entity';

export enum NotaCreditoEventoTipo {
  EMITIDA = 'EMITIDA',
  ANULADA = 'ANULADA',
}

// Trazabilidad append-only (un trigger en BD rechaza UPDATE y DELETE).
// Cada fila guarda el saldo y estado de la factura antes y después, así la
// historia de un saldo se reconstruye leyendo los eventos en orden.
@Entity('nota_credito_eventos')
export class NotaCreditoEvento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Orden estable aunque dos eventos compartan transacción (p. ej. al corregir).
  @Column({ type: 'bigint', insert: false, update: false })
  secuencia: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'nota_credito_id', type: 'uuid' })
  notaCreditoId: string;

  @Column({ name: 'factura_id', type: 'uuid' })
  facturaId: string;

  @Column({ type: 'varchar', length: 20 })
  tipo: NotaCreditoEventoTipo;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  monto: string;

  @Column({ name: 'saldo_antes', type: 'numeric', precision: 14, scale: 2 })
  saldoAntes: string;

  @Column({ name: 'saldo_despues', type: 'numeric', precision: 14, scale: 2 })
  saldoDespues: string;

  @Column({ name: 'estado_factura_antes', type: 'varchar', length: 20 })
  estadoFacturaAntes: FacturaEstado;

  @Column({ name: 'estado_factura_despues', type: 'varchar', length: 20 })
  estadoFacturaDespues: FacturaEstado;

  @Column({ type: 'varchar', length: 255 })
  motivo: string;

  @Column({ name: 'ocurrido_at', type: 'timestamptz', insert: false, update: false })
  ocurridoAt: Date;
}
