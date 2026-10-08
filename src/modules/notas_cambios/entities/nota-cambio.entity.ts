import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Nota } from '../../notas/entities/nota.entity';

@Entity('notas_cambios')
export class NotaCambio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_nota', type: 'uuid' })
  idNota: string;

  @ManyToOne(() => Nota, (nota) => nota.notasCambios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_nota' })
  nota: Nota;

  @Column({ type: 'text' })
  campo: string;

  @Column({ name: 'nuevo_valor', type: 'text' })
  nuevoValor: string;
}
