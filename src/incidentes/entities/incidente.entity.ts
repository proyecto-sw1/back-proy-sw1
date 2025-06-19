// src/incidentes/entities/incidente.entity.ts
import { PublicacionEntity } from 'src/publicaciones/entities/publicacion.entity';
import { User } from 'src/users/entities/user.entity';

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('incidentes_mapa')
export class IncidenteMapaEntity {
  @PrimaryGeneratedColumn()
  id_incidente: number;

  @ManyToOne(() => User, (user) => user.incidentes)
  usuario: User;

  @Column({
    type: 'enum',
    enum: ['accidente', 'bloqueo', 'cierre'],
  })
  tipo_incidente: 'accidente' | 'bloqueo' | 'cierre';

  @Column({ type: 'varchar', length: 100 })
  latitud_longitud: string; // "lat,lng" ejemplo: "-16.5000,-68.1193"

  @CreateDateColumn()
  fecha_incidente: Date;

  // Relación con publicaciones (un incidente puede tener múltiples publicaciones)
  @OneToMany(() => PublicacionEntity, (publicacion) => publicacion.incidente)
  publicaciones: PublicacionEntity[];
}