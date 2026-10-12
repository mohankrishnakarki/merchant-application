import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Request,
  Req,
  ParseUUIDPipe,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApplicationsService } from '@modules/applications/applications.service';
import {
  CreateApplicationDto,
  AssignReviewerDto,
  ReviewDecisionDto,
  FilterApplicationsDto,
  UpdateApplicationDto,
} from '@modules/applications/dto/application.dto';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RolesGuard } from '@core/guards/roles.guard';
import { ApplicationAccessGuard } from '@modules/applications/guards/application-access.guard';
import { Roles } from '@core/decorators/roles.decorator';
import { Role } from '@core/enums/roles.enum';
import { IUser } from '@core/interfaces/user.interface';
import { Headers as RequestHeaders } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private service: ApplicationsService) {}

  @Post()
  @Roles(Role.SALES, Role.ADMIN)
  create(@Body() dto: CreateApplicationDto, @Request() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  list(@Query() filter: FilterApplicationsDto, @Request() req: any) {
    return this.service.list(filter, req.user);
  }

  @Get(':id')
  @UseGuards(ApplicationAccessGuard)
  findOne(@Request() req: any) {
    return req.targetApplication;
  }

  @Patch(':id')
  @Roles(Role.SALES, Role.ADMIN)
  @UseGuards(ApplicationAccessGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDto,
    @Query('version', ParseIntPipe) version: number,
    @Req() req: { user: IUser },
  ) {
    if (version < 1) {
      throw new BadRequestException('Invalid version');
    }

    return this.service.update(id, dto, req.user, version);
  }

  @Post(':id/submit')
  @Roles(Role.SALES, Role.ADMIN)
  @UseGuards(ApplicationAccessGuard)
  submit(@Request() req: any) {
    return this.service.submit(req.targetApplication, req.user.id);
  }

  @Post(':id/assign')
  @Roles(Role.ADMIN)
  @UseGuards(ApplicationAccessGuard)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignReviewerDto,
    @Request() req: any,
  ) {
    return this.service.assignReviewer(
      req.targetApplication,
      dto.reviewerId,
      req.user.id,
    );
  }

  @Post(':id/decision')
  @Roles(Role.REVIEWER, Role.ADMIN)
  @UseGuards(ApplicationAccessGuard)
  decision(
    @Param('id') id: string,
    @Body() dto: ReviewDecisionDto,
    @Request() req: any,
  ) {
    return this.service.recordDecision(req.targetApplication, dto, req.user.id);
  }
}
