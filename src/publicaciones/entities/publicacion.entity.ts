// src/publicaciones/entities/publicacion.entity.ts
import { User } from 'src/users/entities/user.entity';
import { IncidenteMapaEntity } from 'src/incidentes/entities/incidente.entity';
import { ComentarioEntity } from 'src/comentarios/entities/comentario.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('publicaciones')
export class PublicacionEntity {
  @PrimaryGeneratedColumn()
  id_publicacion: number;

  @ManyToOne(() => User, (user) => user.publicaciones)
  usuario: User;

  @ManyToOne(() => IncidenteMapaEntity, (incidente) => incidente.publicaciones, {
    nullable: true,
  })
  incidente: IncidenteMapaEntity;

  @Column({ type: 'text', nullable: true })
  contenido_texto: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  ruta_media: string; // Ruta del archivo multimedia

  @Column({
    type: 'enum',
    enum: ['pendiente', 'aprobado', 'rechazado'],
    default: 'pendiente',
  })
  estado_revision: 'pendiente' | 'aprobado' | 'rechazado';

  @CreateDateColumn()
  fecha_publicacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;

  // Relación con comentarios
  @OneToMany(() => ComentarioEntity, (comentario) => comentario.publicacion)
  comentarios: ComentarioEntity[];
}