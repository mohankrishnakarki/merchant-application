import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '@core/enums/roles.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ 
    description: 'The email address of the new user',
    example: 'sales1@merchantpay.com' 
  })
  @IsEmail()
  email: string;
  @ApiProperty({ 
    description: 'The secure password for the account',
    example: 'StrongPassword123!',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ 
    description: 'The RBAC role assigned to the user',
    enum: Role,
    example: Role.SALES
  })
  @IsEnum(Role)
  role: Role;
}