import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
 app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://localhost:4000',
  ],  
  });

  const config = new DocumentBuilder()
    .setTitle('TripWeaver API')
   
    .setVersion('1.0.0')
    .setContact(
      'TripWeaver Support',
      'https://tripweaver.com',
      'support@tripweaver.com',
    )
    .setLicense('MIT License', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:4000', 'Local Development')
    .addServer('https://api.tripweaver.com', 'Production')
    .addServer('https://staging-api.tripweaver.com', 'Staging')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Firebase ID Token for authentication. Obtain from Firebase Authentication after user login or registration. Token should be passed in Authorization header as: Bearer <token>',
        name: 'Authorization',
        in: 'header',
      },
      'firebase-token',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description:
          'Optional API key for service-to-service communication and rate limiting',
      },
      'api-key',
    )
    .addTag('users', 'User Management - Register, login, and manage user profiles')
    .addTag('trips', 'Trip Management - Create and manage travel experiences')
    .addSecurityRequirements('firebase-token')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
      filter: true,
      showCommonExtensions: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
    },
  
    customSiteTitle: 'TripWeaver API Documentation',
    url: '/api-docs-json',
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port, () => {
    console.log(`\n🚀 TripWeaver API running on: http://localhost:${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs\n`);
  });
}

bootstrap();
