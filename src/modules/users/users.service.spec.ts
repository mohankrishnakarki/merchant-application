import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
} from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from '@core/enums/roles.enum';

type AsyncMock = (...args: any[]) => Promise<any>;

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: {
    findOne: jest.Mock<AsyncMock>;
    create: jest.Mock<(...args: any[]) => any>;
    save: jest.Mock<AsyncMock>;
  };

  const userId = '6031bb72-2aff-472d-aa74-f04e19276a89';

  const createUserDto: CreateUserDto = {
    email: 'sales@example.com',
    password: 'SecurePassword123!',
    role: Role.SALES,
  };

  const existingUser = {
    id: userId,
    email: createUserDto.email,
    role: Role.SALES,
    passwordHash: '$2b$10$existingHashedPassword',
  } as User;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn<AsyncMock>(),
      create: jest.fn<(...args: any[]) => any>(),
      save: jest.fn<AsyncMock>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =========================================================
  // CREATE USER
  // =========================================================

  describe('create()', () => {
    it('should create a user successfully', async () => {
      userRepository.findOne.mockResolvedValue(null);

      userRepository.create.mockImplementation((data) => ({
        ...data,
      }));

      userRepository.save.mockImplementation(async (user) => ({
        id: userId,
        ...user,
      }));

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
      expect(result.email).toBe(createUserDto.email);
      expect(result.role).toBe(Role.SALES);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: createUserDto.email,
        },
      });

      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should hash the password before saving the user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      userRepository.create.mockImplementation((data) => data);

      userRepository.save.mockImplementation(async (user) => ({
        id: userId,
        ...user,
      }));

      const result = await service.create(createUserDto);

      expect(result.passwordHash).toBeDefined();

      expect(result.passwordHash).not.toBe(
        createUserDto.password,
      );

      const isPasswordValid = await bcrypt.compare(
        createUserDto.password,
        result.passwordHash,
      );

      expect(isPasswordValid).toBe(true);
    });

    it('should use bcrypt with 10 salt rounds', async () => {
      userRepository.findOne.mockResolvedValue(null);

      userRepository.create.mockImplementation((data) => data);

      userRepository.save.mockImplementation(async (user) => ({
        id: userId,
        ...user,
      }));

      const result = await service.create(createUserDto);

      const rounds = bcrypt.getRounds(result.passwordHash);

      expect(rounds).toBe(10);
    });

    it('should reject duplicate email addresses', async () => {
      userRepository.findOne.mockResolvedValue(existingUser);

      await expect(
        service.create(createUserDto),
      ).rejects.toThrow(ConflictException);

      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should return the correct duplicate email error message', async () => {
      userRepository.findOne.mockResolvedValue(existingUser);

      await expect(
        service.create(createUserDto),
      ).rejects.toThrow(
        'User with this email already exists',
      );
    });

    it('should persist the correct email, role, and password hash', async () => {
      userRepository.findOne.mockResolvedValue(null);

      userRepository.create.mockImplementation((data) => data);

      userRepository.save.mockImplementation(async (user) => ({
        id: userId,
        ...user,
      }));

      await service.create(createUserDto);

      expect(userRepository.create).toHaveBeenCalledWith({
        email: createUserDto.email,
        role: Role.SALES,
        passwordHash: expect.any(String),
      });

      const createdUser = userRepository.create.mock.calls[0][0];

      expect(createdUser).not.toHaveProperty('password');
      expect(createdUser.passwordHash).not.toBe(
        createUserDto.password,
      );
    });

    it('should propagate database errors during user creation', async () => {
      userRepository.findOne.mockResolvedValue(null);

      userRepository.create.mockImplementation((data) => data);

      userRepository.save.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        service.create(createUserDto),
      ).rejects.toThrow('Database connection failed');
    });
  });

  // =========================================================
  // FIND USER BY EMAIL
  // =========================================================

  describe('findByEmail()', () => {
    it('should return a user when the email exists', async () => {
      userRepository.findOne.mockResolvedValue(existingUser);

      const result = await service.findByEmail(
        createUserDto.email,
      );

      expect(result).toEqual(existingUser);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: createUserDto.email,
        },
      });
    });

    it('should return null when the email does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(
        'unknown@example.com',
      );

      expect(result).toBeNull();
    });

    it('should propagate database lookup errors', async () => {
      userRepository.findOne.mockRejectedValue(
        new Error('Database unavailable'),
      );

      await expect(
        service.findByEmail(createUserDto.email),
      ).rejects.toThrow('Database unavailable');
    });
  });

  // =========================================================
  // FIND USER BY ID
  // =========================================================

  describe('findById()', () => {
    it('should return a user when the ID exists', async () => {
      userRepository.findOne.mockResolvedValue(existingUser);

      const result = await service.findById(userId);

      expect(result).toEqual(existingUser);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: userId,
        },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findById('unknown-user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return the correct error message for a missing user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findById('unknown-user-id'),
      ).rejects.toThrow('User not found');
    });

    it('should propagate database errors during ID lookup', async () => {
      userRepository.findOne.mockRejectedValue(
        new Error('Database query failed'),
      );

      await expect(
        service.findById(userId),
      ).rejects.toThrow('Database query failed');
    });
  });
});