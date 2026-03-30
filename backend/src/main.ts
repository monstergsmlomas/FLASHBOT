import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global para todas las rutas: /api/v1/...
  app.setGlobalPrefix('api/v1');

  // Validación automática de los datos que llegan
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Permitir llamadas desde cualquier origen (dev) o del frontend configurado
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${port}/api/v1`);
}

bootstrap();
