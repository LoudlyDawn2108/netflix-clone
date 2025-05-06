import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters';

async function bootstrap() {
  // Create NestJS application
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    cors: false, // We'll configure CORS manually
  });

  // Get ConfigService to access environment variables
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const allowedOrigins = configService
    .get<string>('ALLOWED_ORIGINS', '')
    .split(',')
    .filter((origin) => origin); // Filter out empty strings

  // Apply Helmet with enhanced security configurations
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      // Cross-site scripting protection
      xssFilter: true,
      // Disable X-Powered-By header to hide information about the server
      hidePoweredBy: true,
      // Prevent MIME type sniffing
      noSniff: true,
      // Don't allow the site to be framed
      frameguard: {
        action: 'deny',
      },
      // HTTP Strict Transport Security
      hsts: {
        maxAge: 15552000, // 180 days in seconds
        includeSubDomains: true,
        preload: true,
      },
      // Don't cache sensitive information
      noCache: true,
      // Referrer policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      // Configure crossOriginEmbedderPolicy
      crossOriginEmbedderPolicy: true,
      // Configure crossOriginOpenerPolicy
      crossOriginOpenerPolicy: true,
      // Configure crossOriginResourcePolicy
      crossOriginResourcePolicy: { policy: 'same-site' },
      // Origin isolation
      originAgentCluster: true,
    }),
  );

  // Configure CORS with enhanced security options
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) {
        if (process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'), false);
      }

      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        allowedOrigins.includes('*')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 3600, // Set preflight cache to 1 hour
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Set up global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not defined in DTOs
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are used
      transform: true, // Automatically transform payloads to be objects typed according to DTOs
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Apply global exception filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Set up global prefix for all endpoints
  app.setGlobalPrefix('api');

  // Start the server
  await app.listen(port, '0.0.0.0');
  console.log(`Authentication service is running on: http://localhost:${port}`);
  console.log(`Health check endpoint: http://localhost:${port}/health`);
}

bootstrap();
