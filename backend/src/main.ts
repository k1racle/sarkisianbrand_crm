import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  // API Prefix
  app.setGlobalPrefix('api/v1');
  
  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Sarkisian Brand API')
    .setDescription('Ecosystem API for Sarkisian Brand - B2C/B2B E-commerce, CRM, LMS')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & Authorization')
    .addTag('products', 'Product Catalog')
    .addTag('cart', 'Shopping Cart')
    .addTag('orders', 'Order Management')
    .addTag('shipping', 'Delivery & Shipping')
    .addTag('payments', 'Payment Processing')
    .addTag('crm', 'CRM - Leads, Tasks, Interactions')
    .addTag('b2b', 'B2B Portal')
    .addTag('1c-sync', '1C Enterprise Integration')
    .addTag('bots', 'Telegram & Max Bot Integration')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;
  
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
}

bootstrap();
