import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsNotEmpty, ValidateIf } from 'class-validator';

export class CreatePublicacionDto {
  @ApiProperty({
    description: 'Contenido de texto de la publicación',
    required: false,
    example: 'Accidente en la Av. 6 de Agosto, tráfico lento'
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.ruta_media || o.contenido_texto)
  contenido_texto?: string;

  @ApiProperty({
    description: 'Ruta del archivo multimedia (imagen/video)',
    required: false,
    example: '/uploads/images/accident_123.jpg'
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.contenido_texto || o.ruta_media)
  ruta_media?: string;

  @ApiProperty({
    description: 'ID del incidente asociado (opcional)',
    required: false,
    example: 1
  })
  @IsNumber()
  @IsOptional()
  id_incidente?: number;

  // Validación custom: al menos uno debe estar presente
  @ValidateIf((o) => !o.contenido_texto && !o.ruta_media)
  @IsNotEmpty({ message: 'Debe proporcionar contenido_texto o ruta_media' })
  _validateContent?: any;
}
