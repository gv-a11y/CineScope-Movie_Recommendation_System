import { Global, Module } from '@nestjs/common';
import { MetricsService } from './monitoring/metrics.service';
import { MetricsController } from './monitoring/metrics.controller';
import { HealthController } from './monitoring/health.controller';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { GraphqlExceptionFilter } from './filters/graphql-exception.filter';

@Global()
@Module({
  controllers: [MetricsController, HealthController],
  providers: [MetricsService, LoggingInterceptor, GraphqlExceptionFilter],
  exports: [MetricsService, LoggingInterceptor, GraphqlExceptionFilter],
})
export class CommonModule {}
