import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { DataSource } from 'typeorm';
import { runSeeds } from './database/seeds/seed-runner';
import { CsrfService } from './core/security/csrf.service';
import * as cookieParser from 'cookie-parser';
import { LoggerService } from './core/logging/logger.service';
import { CorrelationIdMiddleware } from './core/logging/correlation-id.middleware';

async function bootstrap() {
  // Initialize the app with our custom logger
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use our custom logger service
  const loggerService = app.get(LoggerService);
  app.useLogger(loggerService);

  loggerService.setContext('Bootstrap');
  loggerService.info('Initializing Streamflix Auth Service');

  const configService = app.get(ConfigService);

  // Get configuration from config service
  const port = configService.get<number>('port', 3000);
  const apiPrefix = configService.get<string>('apiPrefix', 'api');
  const env = configService.get<string>('env', 'development');
  const seedDatabase = configService.get<boolean>(
    'database.seedDatabase',
    false,
  );

  // Set global API prefix
  app.setGlobalPrefix(apiPrefix || 'api');

  // Add correlation ID middleware for request tracing
  app.use(new CorrelationIdMiddleware(app.get(LoggerService)).use);

  // Enable properly configured CORS
  const corsEnabled = configService.get<boolean>('security.corsEnabled', true);
  if (corsEnabled) {
    const corsOrigins = configService.get<string[]>('security.corsOrigins', [
      'http://localhost:3000',
    ]);
    app.enableCors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-XSRF-TOKEN',
        'X-Correlation-ID',
      ],
      exposedHeaders: ['X-Correlation-ID'],
    });
  }

  // Add cookie parser middleware (required for CSRF)
  app.use(cookieParser());

  // Add security middleware with proper configuration
  app.use(
    helmet({
      contentSecurityPolicy: env === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: env === 'production',
      hidePoweredBy: true,
    }),
  );

  // Add CSRF protection
  const csrfService = app.get(CsrfService);
  app.use(csrfService.createCsrfProtection());

  // Add compression middleware
  app.use(compression());

  // Add validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Setup Swagger documentation in non-production environments
  if (env !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Streamflix Auth Service')
      .setDescription('The Streamflix Authentication API')
      .setVersion('1.0')
      .addTag('auth')
      .addTag('users')
      .addTag('health')
      .addTag('metrics')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  // Run database seeds if enabled
  if (seedDatabase) {
    const dataSource = app.get(DataSource);
    await runSeeds(dataSource);
  }

  await app.listen(port || 3000);
  loggerService.info(`🚀 Streamflix Auth Service running on port ${port}`, {
    port,
    env,
    apiPrefix,
  });
}

bootstrap();
