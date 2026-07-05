import {
  IsEnum,
  IsInt,
  IsJSON,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobType, JobStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateJobDto {
  @ApiPropertyOptional({ example: 'My Job Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: JobType, default: JobType.IMMEDIATE })
  @IsEnum(JobType)
  type: JobType;

  @ApiPropertyOptional({ example: { userId: '123' } })
  @IsOptional()
  payload?: any;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(-100)
  @Max(100)
  priority?: number = 0;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number = 3;

  @ApiPropertyOptional({ example: '*/5 * * * *' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  runAt?: string;

  @ApiPropertyOptional({ example: 'key_123' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ example: ['billing', 'prod'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateBatchJobDto {
  @ApiProperty({ type: [CreateJobDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJobDto)
  jobs: CreateJobDto[];
}

export class JobQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ enum: JobType })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiPropertyOptional({ example: 'tag1' })
  @IsOptional()
  @IsString()
  tag?: string;
}
