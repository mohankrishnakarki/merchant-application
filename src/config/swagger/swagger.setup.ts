import { INestApplication, Logger } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createSwaggerConfig } from './swagger.config';

const logger = new Logger('Swagger');

export function setupSwagger(app: INestApplication): void {
  const documentationPath = join(
    process.cwd(),
    'src',
    'config',
    'swagger',
    'docs',
    'api-description.md',
  );

  const description = readFileSync(
    documentationPath,
    'utf-8',
  );

  const config = createSwaggerConfig(description);

  const document = SwaggerModule.createDocument(
    app,
    config,
  );

  SwaggerModule.setup(
    'api/docs',
    app,
    document,
    {
      customSiteTitle: 'Merchant Onboarding API Documentation',

      jsonDocumentUrl: 'api/docs/openapi.json',

      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
      },
    },
  );

  logger.log('Swagger documentation initialized');
}