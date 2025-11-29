import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors(); 

  // Apply global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips away properties that do not have any decorators
    forbidNonWhitelisted: true, // Throws an error if non-whitelisted properties are present
    transform: true, // Automatically transform payloads to be objects initialized of DTO classes
  }));

  // Setup Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('VitrineX AI Backend API')
    .setDescription('API for authentication, multi-tenancy, and AI services')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'firebase-auth', // This name is used in @ApiBearerAuth() decorator
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
