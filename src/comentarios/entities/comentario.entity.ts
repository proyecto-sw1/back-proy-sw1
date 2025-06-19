import { User } from 'src/users/entities/user.entity';
import { PublicacionEntity } from 'src/publicaciones/entities/publicacion.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('comentarios')
export class ComentarioEntity {
  @PrimaryGeneratedColumn()
  id_comentario: number;

  @ManyToOne(() => PublicacionEntity, (publicacion) => publicacion.comentarios)
  publicacion: PublicacionEntity;

  @ManyToOne(() => User, (user) => user.comentarios)
  usuario: User;

  @ManyToOne(() => ComentarioEntity, (comentario) => comentario.respuestas, { nullable: true })
  comentario_padre: ComentarioEntity;

  @OneToMany(() => ComentarioEntity, (comentario) => comentario.comentario_padre)
  respuestas: ComentarioEntity[];

  @Column({ type: 'text' })
  contenido_texto: string;

  @Column({
    type: 'enum',
    enum: ['pendiente', 'aprobado', 'rechazado'],
    default: 'pendiente',
  })
  estado_revision: 'pendiente' | 'aprobado' | 'rechazado';

  @CreateDateColumn()
  fecha_comentario: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}