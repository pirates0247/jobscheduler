import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QueueStatus, RetryStrategy } from '@prisma/client';

export class CreateQueueDto {
  @ApiProperty({ example: 'email-notifications' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number = 0;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  concurrencyLimit?: number = 5;

  @ApiPropertyOptional({
    enum: RetryStrategy,
    default: RetryStrategy.EXPONENTIAL,
  })
  @IsOptional()
  @IsEnum(RetryStrategy)
  retryStrategy?: RetryStrategy = RetryStrategy.EXPONENTIAL;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number = 3;

  @ApiPropertyOptional({ default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(3600000)
  baseRetryDelayMs?: number = 1000;

  @ApiPropertyOptional({ default: 30000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(3600000)
  jobTimeoutMs?: number = 30000;
}

export class UpdateQueueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  concurrencyLimit?: number;

  @ApiPropertyOptional({ enum: RetryStrategy })
  @IsOptional()
  @IsEnum(RetryStrategy)
  retryStrategy?: RetryStrategy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(3600000)
  baseRetryDelayMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(3600000)
  jobTimeoutMs?: number;
}
