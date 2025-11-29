import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ErrorsInterceptor } from './common/interceptors/errors.interceptor'; // Importar ErrorsInterceptor

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(); 

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Adicionar o interceptor globalmente para lidar com erros
  // Nota: Se `APP_INTERCEPTOR` já está sendo usado no `AppModule`, não é necessário adicionar aqui.
  // Mas se for para garantir que ele pega tudo, pode ser adicionado aqui também.
  // Para evitar duplicação ou ordem de execução inesperada, é geralmente preferível adicionar via APP_INTERCEPTOR no AppModule.
  // Para esta demo, vou manter a adição via AppModule. No entanto, se houvesse problemas de captura, seria uma opção.
  // app.useGlobalInterceptors(new ErrorsInterceptor());

  const config = new DocumentBuilder()
    .setTitle('VitrineX AI Backend API')
    .setDescription('API for authentication, multi-tenancy, and AI services')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'firebase-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();