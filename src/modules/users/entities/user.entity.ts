import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '@core/enums/roles.enum';
import { IUser } from '@core/interfaces/user.interface';

@Entity('users')
export class User implements IUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.SALES })
  role: Role;


  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ 
    name: 'created_at', 
    type: 'timestamptz', 
    default: () => 'CURRENT_TIMESTAMP' 
  })
  createdAt!: Date;

  @UpdateDateColumn({ 
    name: 'updated_at', 
    type: 'timestamptz', 
    default: () => 'CURRENT_TIMESTAMP' 
  })
  updatedAt!: Date;
}