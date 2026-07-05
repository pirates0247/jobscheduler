import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const url =
          configService.get<string>('app.redis.url') ??
          'redis://localhost:6379';
        const client = new Redis(url, {
          maxRetriesPerRequest: 3,
          lazyConnect: false,
        });
        client.on('connect', () => console.log('[Redis] Connected'));
        client.on('error', (err) =>
          console.error('[Redis] Error:', err.message),
        );
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
