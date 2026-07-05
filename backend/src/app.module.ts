import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QueuesModule } from './modules/queues/queues.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { WorkersModule } from './modules/workers/workers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EventsModule } from './modules/events/events.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SeedModule } from './modules/seed/seed.module';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10) * 1000,
          limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
        },
      ],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    HealthModule,
    OrganizationsModule,
    ProjectsModule,
    QueuesModule,
    JobsModule,
    WorkersModule,
    DashboardModule,
    EventsModule,
    SchedulerModule,
    SeedModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
