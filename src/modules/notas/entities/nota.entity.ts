import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Factura } from '../../facturas/entities/factura.entity';
import { NotaCambio } from '../../notas_cambios/entities/nota-cambio.entity';
import { NotaHistory } from '../../notas_history/entities/nota-history.entity';

@Entity('notas')
export class Nota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_factura', type: 'uuid' })
  idFactura: string;

  @ManyToOne(() => Factura, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_factura' })
  factura: Factura;

  @Column({ type: 'boolean', default: false })
  corregir: boolean;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'timestamptz', nullable: true })
  cerrado: Date | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated: Date;

  @OneToMany(() => NotaCambio, (cambio) => cambio.nota)
  notasCambios: NotaCambio[];

  @OneToMany(() => NotaHistory, (history) => history.nota)
  notasHistory: NotaHistory[];
}
