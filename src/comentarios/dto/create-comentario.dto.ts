import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, MinLength, MaxLength, IsOptional, ValidateIf } from 'class-validator';

export class CreateComentarioDto {
  @ApiProperty({
    description: 'ID de la publicación a comentar (requerido si no es respuesta)',
    example: 1,
    required: false
  })
  @IsNumber()
  @IsOptional()
  @ValidateIf((o) => !o.id_comentario_padre)
  @IsNotEmpty({ message: 'Debe proporcionar id_publicacion o id_comentario_padre' })
  id_publicacion?: number;

  @ApiProperty({
    description: 'ID del comentario al que se responde (opcional)',
    example: 5,
    required: false
  })
  @IsNumber()
  @IsOptional()
  id_comentario_padre?: number;

  @ApiProperty({
    description: 'Contenido del comentario',
    example: 'Gracias por la información, muy útil',
    minLength: 1,
    maxLength: 500
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'El comentario no puede estar vacío' })
  @MaxLength(500, { message: 'El comentario no puede exceder 500 caracteres' })
  contenido_texto: string;
}