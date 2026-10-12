import { Role } from '@core/enums/roles.enum';

export interface IUser {
 id: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean; 
  createdAt: Date;
  updatedAt: Date;
}