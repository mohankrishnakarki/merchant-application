import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  Controller,
  Post,
  Get,
  Body,
  Param,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { UsersService } from '@modules/users/users.service';
import { User } from '@modules/users/entities/user.entity';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { Role } from '@core/enums/roles.enum';
import {
  buildCreateUserDto,
  buildTestId,
  buildTestUser,
} from './factories/test-data.factory';

// Test-only controller exposing the UsersService through HTTP.
// Replace with your real UsersController if one exists.
@Controller('users')
class TestUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}

describe('Users Integration (e2e)', () => {
  let app: INestApplication;

  const userId = buildTestId();

  const createUserDto: CreateUserDto = buildCreateUserDto();

  const existingUser = buildTestUser({
    id: userId,
    email: createUserDto.email,
    role: Role.SALES,
    passwordHash: '$2b$10$existingPasswordHash',
  });

  const mockUserRepository = {
    findOne: jest.fn<(...args: any[]) => Promise<any>>(),
    create: jest.fn<(...args: any[]) => any>(),
    save: jest.fn<(...args: any[]) => Promise<any>>(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        controllers: [TestUsersController],
        providers: [
          UsersService,
          {
            provide: getRepositoryToken(User),
            useValue: mockUserRepository,
          },
        ],
      }).compile();

    app = moduleFixture.createNestApplication({
      logger: false,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('should create a new user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      mockUserRepository.create.mockImplementation((data: any) => ({
        id: userId,
        ...data,
      }));

      mockUserRepository.save.mockImplementation(
        async (user: any) => user,
      );

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe(createUserDto.email);
      expect(response.body.role).toBe(Role.SALES);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: createUserDto.email,
        },
      });

      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should hash password before saving user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      mockUserRepository.create.mockImplementation((data: any) => ({
        id: userId,
        ...data,
      }));

      mockUserRepository.save.mockImplementation(
        async (user: any) => user,
      );

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const savedUser = mockUserRepository.save.mock.calls[0][0];

      expect(savedUser.passwordHash).toBeDefined();
      expect(savedUser.passwordHash).not.toBe(createUserDto.password);

      const passwordMatches = await bcrypt.compare(
        createUserDto.password,
        savedUser.passwordHash,
      );

      expect(passwordMatches).toBe(true);
    });

    it('should return 409 when email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(existingUser);

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(409);

      expect(response.body.message).toBe(
        'User with this email already exists',
      );

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          ...createUserDto,
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should return 400 when password is missing', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          email: createUserDto.email,
          role: Role.SALES,
        })
        .expect(400);
    });

    it('should return 400 when role is invalid', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          ...createUserDto,
          role: 'INVALID_ROLE',
        })
        .expect(400);
    });

    it('should return 400 for unexpected fields', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          ...createUserDto,
          isAdmin: true,
        })
        .expect(400);
    });

    it('should return 500 when database save fails', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      mockUserRepository.create.mockImplementation((data: any) => ({
        id: userId,
        ...data,
      }));

      mockUserRepository.save.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(500);
    });
  });

  describe('GET /users/email/:email', () => {
    it('should return an existing user', async () => {
      mockUserRepository.findOne.mockResolvedValue(existingUser);

      const response = await request(app.getHttpServer())
        .get(`/users/email/${createUserDto.email}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe(createUserDto.email);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: createUserDto.email,
        },
      });
    });

    it('should return null when email does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/users/email/${buildTestUser().email}`)
        .expect(200);

      // NestJS serializes a null HTTP response as an empty body.
      expect(response.text).toBe('');
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by ID', async () => {
      mockUserRepository.findOne.mockResolvedValue(existingUser);

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200);

      expect(response.body.id).toBe(userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: userId,
        },
      });
    });

    it('should return 404 when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/users/non-existent-id')
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });

    it('should return 500 when database query fails', async () => {
      mockUserRepository.findOne.mockRejectedValue(
        new Error('Database query failed'),
      );

      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(500);
    });
  });
});