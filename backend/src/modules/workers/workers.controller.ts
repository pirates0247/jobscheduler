import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkersService } from './workers.service';
import {
  RegisterWorkerDto,
  HeartbeatWorkerDto,
  ClaimJobsDto,
  CompleteJobDto,
  FailJobDto,
} from './dto/worker.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Workers')
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new worker node' })
  async register(@Body() dto: RegisterWorkerDto) {
    return this.workersService.register(dto);
  }

  @Public()
  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send heartbeat update from a worker node' })
  async heartbeat(@Param('id') id: string, @Body() dto: HeartbeatWorkerDto) {
    return this.workersService.heartbeat(id, dto);
  }

  @Public()
  @Post(':id/claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atomic job claiming request' })
  async claim(@Param('id') id: string, @Body() dto: ClaimJobsDto) {
    return this.workersService.claimJobs(id, dto);
  }

  @Public()
  @Post(':id/jobs/:jobId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark job as completed successfully' })
  async complete(
    @Param('id') id: string,
    @Param('jobId') jobId: string,
    @Body() dto: CompleteJobDto,
  ) {
    return this.workersService.completeJob(id, jobId, dto);
  }

  @Public()
  @Post(':id/jobs/:jobId/fail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark job as failed' })
  async fail(
    @Param('id') id: string,
    @Param('jobId') jobId: string,
    @Body() dto: FailJobDto,
  ) {
    return this.workersService.failJob(id, jobId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List all registered workers' })
  async findAll() {
    return this.workersService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get details of a worker' })
  async findOne(@Param('id') id: string) {
    return this.workersService.findOneWorker(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'De-register/delete a worker' })
  async remove(@Param('id') id: string) {
    await this.workersService.remove(id);
  }
}
