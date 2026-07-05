import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { QueuesModule } from '../queues/queues.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [QueuesModule, EventsModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
