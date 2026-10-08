import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Nota } from '../../notas/entities/nota.entity';

@Entity('notas_history')
export class NotaHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_nota', type: 'uuid' })
  idNota: string;

  @ManyToOne(() => Nota, (nota) => nota.notasHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_nota' })
  nota: Nota;

  @Column({ type: 'text' })
  descripcion: string;

  @CreateDateColumn({ name: 'creado', type: 'timestamptz' })
  creado: Date;
}
