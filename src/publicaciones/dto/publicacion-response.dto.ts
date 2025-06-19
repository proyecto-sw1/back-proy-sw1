export class PublicacionResponseDto {
  id_publicacion: number;
  contenido_texto?: string;
  ruta_media?: string;
  estado_revision: 'pendiente' | 'aprobado' | 'rechazado';
  fecha_publicacion: Date;
  fecha_actualizacion: Date;
  usuario: {
    id: number;
    name: string;
    email: string;
  };
  incidente?: {
    id_incidente: number;
    tipo_incidente: string;
    latitud_longitud: string;
  };
  total_comentarios?: number;
}
