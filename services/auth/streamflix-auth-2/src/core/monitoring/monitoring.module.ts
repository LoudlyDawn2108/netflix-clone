import { Module, Global } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { TracingService } from './tracing.service';

@Global()
@Module({
  providers: [MetricsService, TracingService],
  controllers: [MetricsController],
  exports: [MetricsService, TracingService],
})
export class MonitoringModule {}
