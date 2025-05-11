import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({
        description: 'Correo electrónico del usuario'
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'Contraseña del usuario (mínimo 6 caracteres)'
    })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({
        description: 'Nombre del usuario',
        required: false
    })
    @IsString()
    @IsOptional()
    name?: string;
}
