// src/consultas/entities/consulta.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('consultas')
export class Consulta {
  @PrimaryGeneratedColumn()
  id_consulta: number;

  @ManyToOne(() => User, user => user.consultas)
  usuario: User;

  @Column()
  tipo_consulta: 'texto' | 'voz';

  @Column({ type: 'text' })
  contenido: string;

  @Column({ type: 'text' })
  respuesta: string;

  @CreateDateColumn()
  fecha_consulta: Date;
}
