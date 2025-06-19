export class ComentarioResponseDto {
  id_comentario: number;
  contenido_texto: string;
  estado_revision: 'pendiente' | 'aprobado' | 'rechazado';
  fecha_comentario: Date;
  fecha_actualizacion: Date;
  es_respuesta: boolean; // Indica si es respuesta a otro comentario
  total_respuestas: number; // Cantidad de respuestas que tiene
  usuario: {
    id: number;
    name: string;
    email: string;
  };
  publicacion: {
    id_publicacion: number;
    contenido_texto?: string;
    usuario: {
      id: number;
      name: string;
    };
  };
  comentario_padre?: {
    id_comentario: number;
    contenido_texto: string;
    usuario: {
      id: number;
      name: string;
    };
  };
  respuestas?: ComentarioResponseDto[]; // Para comentarios anidados (opcional)
}
