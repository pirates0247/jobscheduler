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
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.orgsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations for current user' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.orgsService.findAllForUser(userId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get organization details by slug' })
  async findOne(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.orgsService.findBySlug(slug, userId);
  }

  @Put(':slug')
  @ApiOperation({ summary: 'Update organization details' })
  async update(
    @Param('slug') slug: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.orgsService.update(slug, dto, userId);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization' })
  async remove(@Param('slug') slug: string, @CurrentUser('id') userId: string) {
    await this.orgsService.delete(slug, userId);
  }

  @Post(':slug/members')
  @ApiOperation({ summary: 'Invite/add member to organization' })
  async inviteMember(
    @Param('slug') slug: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.orgsService.inviteMember(slug, dto, userId);
  }

  @Get(':slug/members')
  @ApiOperation({ summary: 'Get all members of organization' })
  async getMembers(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.orgsService.getMembers(slug, userId);
  }

  @Put(':slug/members/:memberId')
  @ApiOperation({ summary: 'Update role of organization member' })
  async updateMemberRole(
    @Param('slug') slug: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.orgsService.updateMemberRole(slug, memberId, dto, userId);
  }

  @Delete(':slug/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from organization' })
  async removeMember(
    @Param('slug') slug: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.orgsService.removeMember(slug, memberId, userId);
  }
}
