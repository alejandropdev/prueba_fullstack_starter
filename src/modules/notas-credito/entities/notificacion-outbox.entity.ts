import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum NotificacionTipo {
  NOTA_CREDITO_EMITIDA = 'NOTA_CREDITO_EMITIDA',
  NOTA_CREDITO_ANULADA = 'NOTA_CREDITO_ANULADA',
}

export enum NotificacionEstado {
  PENDIENTE = 'pendiente',
  ENVIADA = 'enviada',
  FALLIDA = 'fallida',
}

export interface NotificacionPayload {
  notaCreditoId: string;
  numeroNotaCredito: string;
  facturaId: string;
  numeroFactura: string;
  monto: string;
  moneda: string;
  motivo: string;
  saldoPendienteFactura: string;
}

// Cola de avisos al cliente final. La fila se inserta en la misma transacción
// que cambia el saldo; el envío ocurre después del commit (ver OutboxDispatcherService).
@Entity('notificaciones_outbox')
export class NotificacionOutbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'evento_id', type: 'uuid' })
  eventoId: string;

  @Column({ type: 'varchar', length: 40 })
  tipo: NotificacionTipo;

  @Column({ type: 'jsonb' })
  payload: NotificacionPayload;

  @Column({ type: 'varchar', length: 20, default: NotificacionEstado.PENDIENTE })
  estado: NotificacionEstado;

  @Column({ type: 'int', default: 0 })
  intentos: number;

  @Column({ name: 'proximo_intento_at', type: 'timestamptz', default: () => 'now()' })
  proximoIntentoAt: Date;

  @Column({ name: 'ultimo_error', type: 'text', nullable: true })
  ultimoError: string | null;

  @Column({ name: 'enviada_at', type: 'timestamptz', nullable: true })
  enviadaAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
