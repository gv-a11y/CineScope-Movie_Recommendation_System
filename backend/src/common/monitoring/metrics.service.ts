import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: client.Registry;

  public readonly httpRequestCounter: client.Counter;
  public readonly httpRequestDuration: client.Histogram;
  public readonly gqlOperationCounter: client.Counter;
  public readonly gqlOperationDuration: client.Histogram;

  constructor() {
    this.registry = new client.Registry();
    client.collectDefaultMetrics({ register: this.registry, prefix: 'cinescope_' });

    this.httpRequestCounter = new client.Counter({
      name: 'cinescope_http_requests_total',
      help: 'Total number of HTTP requests processed',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'cinescope_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.gqlOperationCounter = new client.Counter({
      name: 'cinescope_graphql_operations_total',
      help: 'Total number of GraphQL operations processed',
      labelNames: ['operation_type', 'operation_name', 'status'],
      registers: [this.registry],
    });

    this.gqlOperationDuration = new client.Histogram({
      name: 'cinescope_graphql_operation_duration_seconds',
      help: 'Duration of GraphQL operations in seconds',
      labelNames: ['operation_type', 'operation_name'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2],
      registers: [this.registry],
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
