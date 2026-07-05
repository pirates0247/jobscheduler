import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import Redis from 'ioredis';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Check health of the backend, DB, and Redis' })
  async getHealth() {
    let dbStatus = 'UP';
    let redisStatus = 'UP';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      dbStatus = 'DOWN';
    }

    try {
      const ping = await this.redis.ping();
      if (ping !== 'PONG') {
        redisStatus = 'DOWN';
      }
    } catch (err) {
      redisStatus = 'DOWN';
    }

    return {
      status: dbStatus === 'UP' && redisStatus === 'UP' ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }
}
