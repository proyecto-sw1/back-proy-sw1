import { Transform } from "class-transformer";
import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';
//validacion para el ingreso de datos de para un reguistro
export class RegisterDto {
    @ApiProperty({ description: 'Nombre del usuario' })
    @Transform(({value}) => value.trim())
    @IsString()
    @MinLength(1)
    name: string;

    @ApiProperty({ description: 'Correo electrónico del usuario' })
    @IsEmail()
    email: string;
    
    @ApiProperty({ description: 'Contraseña del usuario' })
    @Transform(({value}) => value.trim())
    @IsString()
    @MinLength(6)
    password: string;
}