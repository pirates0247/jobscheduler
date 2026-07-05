import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterWorkerDto {
  @ApiProperty({ example: 'worker-node-1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  concurrency?: number = 5;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  queues?: string[] = [];

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;
}

export class HeartbeatWorkerDto {
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  activeJobs?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  memoryMb?: number;

  @ApiPropertyOptional()
  @IsOptional()
  cpuPct?: number;
}

export class ClaimJobsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  queueIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CompleteJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  result?: any;
}

export class FailJobDto {
  @ApiProperty({ example: 'Timeout error occurred' })
  @IsString()
  @IsNotEmpty()
  errorMessage: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorStack?: string;
}
