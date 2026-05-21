import { Controller, Get, Post, Body, Patch, Param, Delete, Request } from '@nestjs/common';
import { VerficationService } from './verfication.service';
import { CreateVerficationDto } from './dto/create-verfication.dto';
import { UpdateVerficationDto } from './dto/update-verfication.dto';

@Controller('verifications')
export class VerficationController {
  constructor(private readonly verficationService: VerficationService) {}

  @Post()
  async create(@Body() createVerficationDto: CreateVerficationDto, @Request() req: any) {
    const uid = req?.user?.uid || req?.user?.sub;
    return this.verficationService.create(uid, createVerficationDto);
  }

  @Get()
  async findAll(@Request() req: any) {
    const uid = req?.user?.uid || req?.user?.sub;
    return this.verficationService.findForUser(uid);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const uid = req?.user?.uid || req?.user?.sub;
    return this.verficationService.findOne(id, uid);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateVerficationDto: UpdateVerficationDto, @Request() req: any) {
    const uid = req?.user?.uid || req?.user?.sub;
    return this.verficationService.update(id, uid, updateVerficationDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const uid = req?.user?.uid || req?.user?.sub;
    return this.verficationService.remove(id, uid);
  }
}
