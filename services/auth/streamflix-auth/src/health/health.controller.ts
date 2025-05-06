import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private typeOrmHealth: TypeOrmHealthIndicator,
    private memoryHealth: MemoryHealthIndicator,
    private diskHealth: DiskHealthIndicator,
    @InjectConnection() private connection: Connection,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database health check
      () =>
        this.typeOrmHealth.pingCheck('database', {
          connection: this.connection,
        }),

      // Memory health check
      () => this.memoryHealth.checkHeap('memory_heap', 200 * 1024 * 1024), // 200MB

      // Disk health check
      () =>
        this.diskHealth.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
}
