import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({
        description: 'Nombre completo del usuario',
        example: 'Juan Pérez López',
        maxLength: 100
    })
    @IsString({ message: 'El nombre debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El nombre es requerido' })
    @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
    name: string;

    @ApiProperty({
        description: 'Correo electrónico del usuario',
        example: 'juan.perez@example.com',
        maxLength: 100
    })
    @IsEmail({}, { message: 'Debe proporcionar un email válido' })
    @MaxLength(100, { message: 'El email no puede exceder 100 caracteres' })
    email: string;

    @ApiProperty({
        description: 'Contraseña del usuario (mínimo 6 caracteres)',
        example: 'password123',
        minLength: 6
    })
    @IsString({ message: 'La contraseña debe ser una cadena de texto' })
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    password: string;

    @ApiProperty({
        description: 'Identificador único del dispositivo del usuario',
        example: 'device_abc123_android_samsung_galaxy_s21',
        required: false
    })
    @IsString({ message: 'El dispositivo debe ser una cadena de texto' })
    @IsOptional()
    dispositivo?: string;
}