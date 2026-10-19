import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../monitoring/metrics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP/GraphQL');

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const gqlCtx = GqlExecutionContext.create(context);
    const info = gqlCtx.getInfo();

    if (info) {
      // GraphQL operation
      const operationType = info.parentType?.name || 'Unknown';
      const operationName = info.fieldName || 'anonymous';

      return next.handle().pipe(
        tap({
          next: () => {
            const durationSec = (Date.now() - start) / 1000;
            this.metricsService.gqlOperationCounter.inc({
              operation_type: operationType,
              operation_name: operationName,
              status: 'success',
            });
            this.metricsService.gqlOperationDuration.observe(
              { operation_type: operationType, operation_name: operationName },
              durationSec,
            );
            this.logger.log(`[GraphQL] ${operationType}.${operationName} - ${(durationSec * 1000).toFixed(1)}ms`);
          },
          error: (err) => {
            const durationSec = (Date.now() - start) / 1000;
            this.metricsService.gqlOperationCounter.inc({
              operation_type: operationType,
              operation_name: operationName,
              status: 'error',
            });
            this.logger.error(
              `[GraphQL ERROR] ${operationType}.${operationName} - ${err.message} (${(durationSec * 1000).toFixed(1)}ms)`,
            );
          },
        }),
      );
    }

    // Standard HTTP request
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const method = req?.method || 'GET';
    const url = req?.url || '';

    return next.handle().pipe(
      tap({
        next: () => {
          const durationSec = (Date.now() - start) / 1000;
          const statusCode = res?.statusCode || 200;
          this.metricsService.httpRequestCounter.inc({
            method,
            route: url,
            status_code: statusCode.toString(),
          });
          this.metricsService.httpRequestDuration.observe(
            { method, route: url, status_code: statusCode.toString() },
            durationSec,
          );
          this.logger.log(`[HTTP] ${method} ${url} ${statusCode} - ${(durationSec * 1000).toFixed(1)}ms`);
        },
        error: (err) => {
          const durationSec = (Date.now() - start) / 1000;
          const statusCode = err.status || 500;
          this.metricsService.httpRequestCounter.inc({
            method,
            route: url,
            status_code: statusCode.toString(),
          });
          this.logger.error(`[HTTP ERROR] ${method} ${url} ${statusCode} - ${err.message}`);
        },
      }),
    );
  }
}
