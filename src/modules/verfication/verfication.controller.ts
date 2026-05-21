import { Controller, Get, Post, Body, Patch, Param, Delete, Request, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { VerficationService } from './verfication.service';
import { CreateVerficationDto } from './dto/create-verfication.dto';
import { UpdateVerficationDto } from './dto/update-verfication.dto';
import { BulkMoveInReviewDto } from './dto/bulk-move-in-review.dto';

class RejectVerificationDto {
  reason!: string;
}

type AuthenticatedRequest = Request & {
  user?: {
    uid?: string;
    sub?: string;
    role?: string;
    name?: string;
    email?: string;
  };
};

@Controller('verifications')
export class VerficationController {
  constructor(private readonly verficationService: VerficationService) {}

  private getAuthContext(req: AuthenticatedRequest) {
    const uid = req.user?.uid || req.user?.sub;
    if (!uid) {
      throw new UnauthorizedException('Unable to extract user identity from token');
    }

    return {
      uid,
      role: req.user?.role,
      name: req.user?.name || req.user?.email,
    };
  }

  private assertAdmin(role?: string) {
    if (role !== 'admin' && role !== 'superadmin') {
      throw new ForbiddenException('Admin or superadmin role required');
    }
  }

  @Post()
  async create(@Body() createVerficationDto: CreateVerficationDto, @Request() req: AuthenticatedRequest) {
    const { uid } = this.getAuthContext(req);
    return this.verficationService.create(uid, createVerficationDto);
  }

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    const { uid } = this.getAuthContext(req);
    return this.verficationService.findForUser(uid);
  }

  @Get('admin/pending')
  async findPendingForAdmin(@Request() req: AuthenticatedRequest) {
    const { role } = this.getAuthContext(req);
    this.assertAdmin(role);
    return this.verficationService.findPendingForAdmin();
  }

  @Get('admin/in-review')
  async findInReviewForAdmin(@Request() req: AuthenticatedRequest) {
    const { uid, role } = this.getAuthContext(req);
    this.assertAdmin(role);
    return this.verficationService.findInReviewForAdmin(uid);
  }

  @Get('admin/:id/details')
  async getAdminReviewDetails(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const { role } = this.getAuthContext(req);
    this.assertAdmin(role);
    return this.verficationService.getAdminReviewDetails(id);
  }

  @Patch('admin/bulk-in-review')
  async moveManyToInReview(@Body() body: BulkMoveInReviewDto, @Request() req: AuthenticatedRequest) {
    const { uid, role, name } = this.getAuthContext(req);
    this.assertAdmin(role);
    return this.verficationService.moveManyToInReview(body.ids, uid, name);
  }

  @Patch('admin/:id/approve')
  async approveByAdmin(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const { uid, role, name } = this.getAuthContext(req);
    this.assertAdmin(role);
    return this.verficationService.approveByAdmin(id, uid, name);
  }

  @Patch('admin/:id/reject')
  async rejectByAdmin(@Param('id') id: string, @Body() body: RejectVerificationDto, @Request() req: AuthenticatedRequest) {
    const { uid, role, name } = this.getAuthContext(req);
    this.assertAdmin(role);
    return this.verficationService.rejectByAdmin(id, uid, body.reason, name);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const { uid } = this.getAuthContext(req);
    return this.verficationService.findOne(id, uid);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateVerficationDto: UpdateVerficationDto, @Request() req: AuthenticatedRequest) {
    const { uid } = this.getAuthContext(req);
    return this.verficationService.update(id, uid, updateVerficationDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const { uid } = this.getAuthContext(req);
    return this.verficationService.remove(id, uid);
  }
}
