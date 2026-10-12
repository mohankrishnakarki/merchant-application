import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
} from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UsersService } from '@modules/users/users.service';
import { LoginDto } from './dto/login.dto';
import { Role } from '@core/enums/roles.enum';

describe('AuthService', () => {
  let service: AuthService;

  // =========================================================
  // Mock Dependencies
  // =========================================================

  const mockUsersService = {
    findByEmail: jest.fn<
      (...args: unknown[]) => Promise<any>
    >(),
  };

  const mockJwtService = {
    sign: jest.fn<(...args: unknown[]) => string>(),
  };

  // =========================================================
  // Test Data
  // =========================================================

  const userId = '6031bb72-2aff-472d-aa74-f04e19276a89';

  const loginDto: LoginDto = {
    email: 'sales@example.com',
    password: 'SecurePassword123!',
  };

  let passwordHash: string;

  const jwtToken = 'mock.jwt.access.token';

  // =========================================================
  // Setup
  // =========================================================

  beforeEach(async () => {
    jest.clearAllMocks();

    passwordHash = await bcrypt.hash(loginDto.password, 10);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // =========================================================
  // INITIALIZATION
  // =========================================================

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =========================================================
  // SUCCESSFUL LOGIN
  // =========================================================

  describe('login() - Success', () => {
    it('should authenticate a user with valid credentials', async () => {
      const user = {
        id: userId,
        email: loginDto.email,
        role: Role.SALES,
        passwordHash,
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue(jwtToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: jwtToken,
        user: {
          id: userId,
          email: loginDto.email,
          role: Role.SALES,
        },
      });

      expect(
        mockUsersService.findByEmail,
      ).toHaveBeenCalledWith(loginDto.email);

      expect(mockJwtService.sign).toHaveBeenCalledTimes(1);
    });

    it('should generate JWT with correct payload', async () => {
      const user = {
        id: userId,
        email: loginDto.email,
        role: Role.SALES,
        passwordHash,
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue(jwtToken);

      await service.login(loginDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: userId,
        email: loginDto.email,
        role: Role.SALES,
      });
    });

    it('should not expose passwordHash in login response', async () => {
      const user = {
        id: userId,
        email: loginDto.email,
        role: Role.SALES,
        passwordHash,
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      mockJwtService.sign.mockReturnValue(jwtToken);

      const result = await service.login(loginDto);

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should support ADMIN login', async () => {
      const admin = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: Role.ADMIN,
        passwordHash,
      };

      mockUsersService.findByEmail.mockResolvedValue(admin);
      mockJwtService.sign.mockReturnValue(jwtToken);

      const result = await service.login({
        email: admin.email,
        password: loginDto.password,
      });

      expect(result.user.role).toBe(Role.ADMIN);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: admin.id,
        email: admin.email,
        role: Role.ADMIN,
      });
    });

    it('should support REVIEWER login', async () => {
      const reviewer = {
        id: 'reviewer-user-id',
        email: 'reviewer@example.com',
        role: Role.REVIEWER,
        passwordHash,
      };

      mockUsersService.findByEmail.mockResolvedValue(reviewer);
      mockJwtService.sign.mockReturnValue(jwtToken);

      const result = await service.login({
        email: reviewer.email,
        password: loginDto.password,
      });

      expect(result.user.role).toBe(Role.REVIEWER);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: reviewer.id,
        email: reviewer.email,
        role: Role.REVIEWER,
      });
    });
  });

  // =========================================================
  // INVALID CREDENTIALS
  // =========================================================

  describe('login() - Invalid Credentials', () => {
    it('should reject login when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should reject login with incorrect password', async () => {
      const user = {
        id: userId,
        email: loginDto.email,
        role: Role.SALES,
        passwordHash,
      };

      mockUsersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({
          email: loginDto.email,
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should return the same error message for unknown email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'SomePassword',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should return the same error message for incorrect password', async () => {
      const user = {
        id: userId,
        email: loginDto.email,
        role: Role.SALES,
        passwordHash,
      };

      mockUsersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({
          email: loginDto.email,
          password: 'WrongPassword',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should not generate JWT for invalid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login(loginDto),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // DEPENDENCY ERRORS
  // =========================================================

  describe('login() - Error Handling', () => {
    it('should propagate database lookup errors', async () => {
      mockUsersService.findByEmail.mockRejectedValue(
        new Error('Database unavailable'),
      );

      await expect(
        service.login(loginDto),
      ).rejects.toThrow('Database unavailable');

      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should propagate JWT signing errors', async () => {
      const user = {
        id: userId,
        email: loginDto.email,
        role: Role.SALES,
        passwordHash,
      };

      mockUsersService.findByEmail.mockResolvedValue(user);

      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      await expect(
        service.login(loginDto),
      ).rejects.toThrow('JWT signing failed');
    });
  });
});