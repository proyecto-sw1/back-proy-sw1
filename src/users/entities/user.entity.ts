import { ComentarioEntity } from 'src/comentarios/entities/comentario.entity';
import { Consulta } from 'src/consultas/entities/consulta.entity';
import { IncidenteMapaEntity } from 'src/incidentes/entities/incidente.entity';
import { PublicacionEntity } from 'src/publicaciones/entities/publicacion.entity';

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password: string;

  @Column({ type: 'text', nullable: true })
  dispositivo: string; // Campo para almacenar identificador único del dispositivo
  
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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