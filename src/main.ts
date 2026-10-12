import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { SanitizeResponseInterceptor } from
  '@core/interceptors/sanitize-response.interceptor';

import { setupSwagger } from './config/swagger/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  app.useGlobalInterceptors(
    new SanitizeResponseInterceptor(
      app.get(Reflector),
    ),
  );

  setupSwagger(app);

  await app.listen(process.env.PORT || 3000);
}

bootstrap();