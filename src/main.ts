import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder,SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:3000',
  });
  const config = new DocumentBuilder()
  .setTitle('TripWeaver API')
  .setDescription('API Documentation for Tripweaver')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Paste Firebase ID token',
    },
    'firebase-token',
  )
  .addSecurityRequirements('firebase-token')
  .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs',app,document);
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
