import {
  BadGatewayException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import * as bcryptjs from 'bcryptjs';
import { LogingDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register({ name, email, password }: RegisterDto) {
    const user = await this.usersService.findOneByEmail(email);
    //almacena el usuario reguistrado
    if (user) {
      throw new BadGatewayException('⚠️ Este correo ya está registrado. ¿Intentas volver del pasado?');
    }
    await this.usersService.create({
      name,
      email,
      password: await bcryptjs.hash(password, 10), //encriptado de contraseña
    });
    //rellena los campos del usuario asignado en el body luego ser validado por el controlador
    /* devuelve el nombre y correo */
    return {
      name,
      email,
    };
  }

  async login({ email, password }: LogingDto) {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('❌ El correo ingresado no coincide con ningún usuario. Verifica y vuelve a intentar.');
    }
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('🔒 Contraseña incorrecta. ¿Estás seguro de que es tu cuenta?');
    }
    //no poner informacion confidencial del usuario
    const payload = { id: user.id, email: user.email };

    const token = await this.jwtService.signAsync(payload);
    const { password: _, ...userWithoutPassword } = user;
    return {
      token,
      user: userWithoutPassword,
    };
  }

  //prueba para ruta con rol autorizado

  async profile({ email, role }: { email: string; role: string }) {
    return await this.usersService.findOneByEmail(email);
  }


}
