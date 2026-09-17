import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('tenants')
export class Tenant {
  @ApiProperty({ example: '5e1c9c9e-6f1e-4e2b-9d77-3f0cc2e7be41' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Comercializadora El Roble S.A.S' })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({ example: 'el-roble' })
  @Column({ type: 'varchar', length: 150, unique: true })
  slug: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
