import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: mysql.Pool;

  async onModuleInit() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'movie_recommendation_system',
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    try {
      const conn = await this.pool.getConnection();
      this.logger.log('Connected to MySQL database successfully');
      conn.release();
    } catch (err: any) {
      this.logger.error('Failed to connect to MySQL database: ' + err.message);
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('MySQL connection pool closed');
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T> {
    const [results] = await this.pool.query(sql, params);
    return results as T;
  }

  async execute<T = any>(sql: string, params: any[] = []): Promise<T> {
    const [results] = await this.pool.execute(sql, params);
    return results as T;
  }

  getPool(): mysql.Pool {
    return this.pool;
  }
}
