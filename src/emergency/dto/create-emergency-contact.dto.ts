import { IsString, IsOptional, IsEmail, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmergencyContactDto {
  @ApiProperty({ description: 'Nombre del contacto de emergencia' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Número de teléfono del contacto' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Email del contacto' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Token de Firebase Cloud Messaging para notificaciones push' })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiPropertyOptional({ description: 'Relación con el contacto (familia, amigo, trabajo, etc.)' })
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiPropertyOptional({ description: 'Si el contacto está activo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Prioridad del contacto (1-5, donde 1 es más importante)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;
} 