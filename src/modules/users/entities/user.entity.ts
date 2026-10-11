import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { Role } from '@core/enums/roles.enum';
import { IUser } from '@core/interfaces/user.interface';

@Entity('users')
export class User implements IUser {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() passwordHash: string;
  @Column({ type: 'enum', enum: Role, default: Role.SALES }) role: Role;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}