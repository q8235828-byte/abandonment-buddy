import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Abandonment Buddy API')
    .setDescription('WooCommerce Abandoned Cart SaaS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT') || 3001;

  await app.listen(port);

  console.log(
    `🚀 API running at http://localhost:${port}`,
  );

  console.log(
    `📚 Swagger docs: http://localhost:${port}/docs`,
  );
}

bootstrap();