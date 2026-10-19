import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load root .env first, then local .env if present
dotenv.config({ path: resolve(__dirname, '../../.env') });
dotenv.config();

import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';
import { MetricsService } from './common/monitoring/metrics.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL || '',
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Apollo-Require-Preflight'],
  });

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new LoggingInterceptor(metricsService));
  app.useGlobalFilters(new GraphqlExceptionFilter());

  const port = process.env.BACKEND_PORT || process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🎬 CineScope NestJS GraphQL Backend running at http://localhost:${port}/graphql`);
  logger.log(`📊 Prometheus Metrics running at http://localhost:${port}/metrics`);
  logger.log(`🩺 Health check running at http://localhost:${port}/health`);
}

bootstrap();
