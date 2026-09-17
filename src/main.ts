import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Prueba técnica Aravia - API')
    .setDescription(
      'Auth + tenants + facturas. Los endpoints protegidos reciben el token en el header `Authorization: Bearer <accessToken>` (obtenlo en `POST /auth/login`).',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Prueba técnica Aravia - Docs',
  });

  const port = configService.get<string>('APP_PORT', '3000');
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API lista en http://localhost:${port} (docs en /docs)`);
}

bootstrap();
