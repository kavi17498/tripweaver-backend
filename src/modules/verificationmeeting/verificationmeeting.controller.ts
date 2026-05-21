import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Request, UnauthorizedException } from '@nestjs/common';

import { CreateVerificationMeetingDto } from './dto/create-verificationmeeting.dto';
import { SubmitMeetingSummaryDto } from './dto/submit-meeting-summary.dto';
import { VerificationMeetingService } from './verificationmeeting.service';

type AuthenticatedRequest = Request & {
  user?: {
    uid?: string;
    sub?: string;
    role?: string;
    name?: string;
    email?: string;
  };
};

@Controller('verification-meetings')
export class VerificationMeetingController {
  constructor(private readonly verificationMeetingService: VerificationMeetingService) {}

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
  async createMeeting(@Body() dto: CreateVerificationMeetingDto, @Request() req: AuthenticatedRequest) {
    const { uid, role, name } = this.getAuthContext(req);
    this.assertAdmin(role);
    return this.verificationMeetingService.createMeeting(dto, uid, name);
  }

  @Patch(':verificationId/summary')
  async submitSummary(
    @Param('verificationId') verificationId: string,
    @Body() dto: SubmitMeetingSummaryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const { uid, role } = this.getAuthContext(req);
    this.assertAdmin(role);
    return this.verificationMeetingService.submitSummary(verificationId, dto.summary, uid);
  }

  @Get(':verificationId')
  async getByVerification(@Param('verificationId') verificationId: string, @Request() req: AuthenticatedRequest) {
    const { role } = this.getAuthContext(req);
    this.assertAdmin(role);
    return this.verificationMeetingService.getByVerificationId(verificationId);
  }
}
