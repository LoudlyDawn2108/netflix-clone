import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Get()
  async getMetrics(@Res() res: Response): Promise<void> {
    res.set('Content-Type', this.metricsService.getRegistry().contentType);
    res.send(await this.metricsService.getRegistry().metrics());
  }
}
