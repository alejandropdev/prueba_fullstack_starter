import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum NotificacionTipo {
  EMITIDA = 'nota_credito_emitida',
  CORREGIDA = 'nota_credito_corregida',
  ANULADA = 'nota_credito_anulada',
}

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'factura_id', type: 'uuid' })
  facturaId: string;

  @Column({ name: 'nota_credito_id', type: 'uuid' })
  notaCreditoId: string;

  @Column({ name: 'cliente_nombre', type: 'varchar', length: 150 })
  clienteNombre: string;

  @Column({ name: 'cliente_email', type: 'varchar', length: 150 })
  clienteEmail: string;

  @Column({ type: 'varchar', length: 40 })
  tipo: NotificacionTipo;

  @Column({ type: 'varchar', length: 200 })
  asunto: string;

  @Column({ type: 'text' })
  mensaje: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
