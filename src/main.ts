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
    .setTitle('Prueba técnica Aravia')
    .setDescription(
      'Auth, tenants, facturas y notas de crédito. Cada nota ajusta el saldo en una transacción, deja historial y registra el aviso al cliente.',
    )
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<string>('APP_PORT', '3000');
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API lista en http://localhost:${port} (docs en /docs)`);
}

bootstrap();
