import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: false });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = configService.get<string>('app.apiPrefix')!;
  const port = configService.get<number>('app.port')!;
  const corsOrigin = configService.get<string>('app.corsOrigin');
  const nodeEnv = configService.get<string>('app.nodeEnv');

  app.setGlobalPrefix(apiPrefix);

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow Swagger UI assets
    }),
  );
  app.use(cookieParser());

  // Compression
  app.use(compression());

  // CORS
  const allowedOrigins = corsOrigin
    ? corsOrigin.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Distributed Job Scheduler API')
    .setDescription('Production-ready Distributed Job Scheduler API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Application listening on port ${port} (prefix: /${apiPrefix})`);
  logger.log(
    `Swagger documentation available at http://localhost:${port}/api/docs`,
  );
  logger.log(`Environment: ${nodeEnv ?? 'development'}`);
}

bootstrap();
