import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { LoggerService } from './logger.service';
import { loggerConfig } from './logger.config';

@Global()
@Module({
  imports: [WinstonModule.forRoot(loggerConfig)],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggingModule {}
