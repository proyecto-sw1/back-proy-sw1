import { Transform } from "class-transformer";
import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class LogingDto{
    @ApiProperty({ description: 'Correo electrónico del usuario' })
    @IsEmail()
    email: string;
    
    @ApiProperty({ description: 'Contraseña del usuario' })
    @Transform(({value}) => value.trim())
    @IsString()
    @MinLength(6)
    password: string;
}
