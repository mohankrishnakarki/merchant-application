import { DocumentBuilder } from '@nestjs/swagger';

export function createSwaggerConfig(description: string) {
  return new DocumentBuilder()
    .setTitle('Merchant Onboarding & Risk Management API')
    .setDescription(description)
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Authentication and authorization')
    .addTag('Merchant Applications', 'Merchant onboarding management')
    .addTag('Review Management', 'Reviewer assignment and decisions')
    .addTag('Risk Review', 'Asynchronous KYB risk evaluation')
    .addTag('Audit Logs', 'Application audit history')
    .build();
}