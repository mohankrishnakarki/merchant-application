import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantApplication } from '@modules/applications/entities/merchant-application.entity';
import { Role } from '@core/enums/roles.enum';

@Injectable()
export class ApplicationAccessGuard implements CanActivate {
  constructor(@InjectRepository(MerchantApplication) private repo: Repository<MerchantApplication>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (!req.params.id) return true;

    const app = await this.repo.findOne({ where: { id: req.params.id } });
    if (!app) throw new NotFoundException('Application not found');
    
    req.targetApplication = app;
    const user = req.user;

    if (user.role === Role.ADMIN) return true;
    
    // SALES Isolation: Can only access apps they created
    if (user.role === Role.SALES) {
      if (app.createdById !== user.id) throw new ForbiddenException('Strict isolation policy violation.');
      return true;
    }

    // REVIEWER Isolation: Can read all, but decision actions require assignment
    if (user.role === Role.REVIEWER) {
      if (req.url.includes('/decision') && app.assignedReviewerId !== user.id) {
        throw new ForbiddenException('Only assigned reviewer can make decisions.');
      }
      return true;
    }
    return false;
  }
}