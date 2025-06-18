import { AuthGuard } from './guard/auth.guard';
import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LogingDto } from './dto/login.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Auth } from './decorators/auth.decorator';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { UserActiveInterface } from 'src/common/interfaces/user-active.interface';
import { GoogleAuthGuard } from './guard/google-auth.guard'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  register(
    @Body()
    registerDto: RegisterDto,
  ) {
    //obtiene datos desde la api, si es igual al formato del regiterDto permite capturar errores
    return this.authService.register(registerDto);
  }
  @Post('login')
  login(
    @Body()
    loginDto: LogingDto,
  ) {
    return this.authService.login(loginDto);
  }

  /*
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req) {
    // Inicia la autenticación con Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res) {
    try {
      const { token, user } = await this.authService.googleLogin(req.user); // Esperamos la resolución de la promesa
      console.log('Token generado:', token); // Verificamos que el token esté bien
      // Obtener el origen de la solicitud (opcional para entornos múltiples)
      const origin = req.headers.origin || 'http://localhost:4200';
      // Redirigir al frontend correspondiente con el token
      res.redirect(`${origin}/?token=${token}`);
    } catch (error) {
      console.error('Error en la autenticación con Google:', error);
      res.status(500).json({ message: 'Error en la autenticación con Google' });
    }
  }
*/
  //vista a perfil
  @ApiBearerAuth()
  @Get('profile')
  @Auth()
  profile(@ActiveUser() user: UserActiveInterface) {
    console.log(user);
    return this.authService.profile(user);
  }
}
