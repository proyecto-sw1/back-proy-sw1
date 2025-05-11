import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Establecer un prefijo global para las rutas
  app.setGlobalPrefix('api');

  // Habilitar CORS
  app.enableCors({
    origin: '*',  // Permitir solicitudes desde tu frontend en Angular
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',  // Métodos permitidos
    credentials: true,  // Permitir envío de credenciales como cookies
  });

  // Usar pipes globales para la validación de datos
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,  // Remover propiedades no deseadas
      forbidNonWhitelisted: true,  // Lanzar errores si se envían propiedades no permitidas
      transform: true,  // Transformar los datos de entrada a los tipos esperados
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API de Proyecto SW1')
    .setDescription('Documentación de la API del Proyecto SW1')
    .setVersion('1.0')
    .addTag('auth', 'Endpoints de autenticación')
    .addTag('users', 'Endpoints de usuarios')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa tu token JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Iniciar la aplicación en el puerto 3000
  await app.listen(parseInt(process.env.PORT) || 3000);
}
bootstrap();
