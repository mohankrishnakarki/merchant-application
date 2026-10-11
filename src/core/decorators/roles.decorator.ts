import { SetMetadata } from '@nestjs/common';
import { Role } from '@core/enums/roles.enum';
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
