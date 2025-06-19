import { ComentarioEntity } from 'src/comentarios/entities/comentario.entity';
// src/users/entities/user.entity.ts
import { Consulta } from 'src/consultas/entities/consulta.entity';
import { IncidenteMapaEntity } from 'src/incidentes/entities/incidente.entity';
import { PublicacionEntity } from 'src/publicaciones/entities/publicacion.entity';

import {
  Column,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: true, select: false })
  password: string;

  @DeleteDateColumn()
  deletedAt: Date;

  // Relaciones existentes
  @OneToMany(() => Consulta, (consulta) => consulta.usuario)
  consultas: Consulta[];

  // Nuevas relaciones
  @OneToMany(() => IncidenteMapaEntity, (incidente) => incidente.usuario)
  incidentes: IncidenteMapaEntity[];

  @OneToMany(() => PublicacionEntity, (publicacion) => publicacion.usuario)
  publicaciones: PublicacionEntity[];

  @OneToMany(() => ComentarioEntity, (comentario) => comentario.usuario)
  comentarios: ComentarioEntity[];
}