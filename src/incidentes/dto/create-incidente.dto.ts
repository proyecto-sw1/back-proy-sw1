import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsLatLong, Matches } from 'class-validator';

export class CreateIncidenteDto {
  @ApiProperty({
    description: 'Tipo de incidente',
    example: 'Accidente de tráfico',
    examples: [
      'Accidente de tráfico',
      'Bloqueo de vía',
      'Manifestación',
      'Obra en construcción',
      'Semáforo dañado',
      'Bache en la vía',
      'Inundación',
      'Otro'
    ]
  })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de incidente es requerido' })
  tipo_incidente: string;

  @ApiProperty({
    description: 'Coordenadas geográficas en formato "latitud,longitud"',
    example: '-16.5000,-68.1193',
    pattern: '^-?[0-9]+\\.?[0-9]*,-?[0-9]+\\.?[0-9]*$'
  })
  @IsString()
  @IsNotEmpty({ message: 'Las coordenadas son requeridas' })
  @Matches(/^-?[0-9]+\.?[0-9]*,-?[0-9]+\.?[0-9]*$/, {
    message: 'Las coordenadas deben estar en formato "latitud,longitud" (ej: -16.5000,-68.1193)'
  })
  latitud_longitud: string;
}