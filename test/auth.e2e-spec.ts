import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';

import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';
import { User } from '../src/modules/users/entities/user.entity';
import { Role } from '../src/core/enums/roles.enum';
import {
  buildTestCredentials,
  buildTestId,
  buildTestUser,
} from './factories/test-data.factory';

type FindOneMock = (
  options: unknown,
) => Promise<User | null>;

describe('Auth Integration (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const userId = buildTestId();

  const validCredentials = buildTestCredentials();
  const unknownUserCredentials = buildTestCredentials();
  const incorrectPasswordCredentials = buildTestCredentials({
    email: validCredentials.email,
    password: 'WrongPassword123!',
  });

  const mockUserRepository = {
    findOne: jest.fn<FindOneMock>(),
  };

  let testUser: User;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(
      validCredentials.password,
      10,
    );

    testUser = buildTestUser({
      id: userId,
      email: validCredentials.email,
      role: Role.SALES,
      passwordHash,
    });

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [
          JwtModule.register({
            secret: 'integration-test-secret-not-for-production',
            signOptions: {
              expiresIn: '1h',
            },
          }),
        ],
        controllers: [AuthController],
        providers: [
          AuthService,
          UsersService,
          {
            provide: getRepositoryToken(User),
            useValue: mockUserRepository,
          },
        ],
      }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app?.close();
  });

  // =========================================================
  // SUCCESSFUL LOGIN
  // =========================================================

  describe('POST /auth/login - Success', () => {
    it('should authenticate a user and return JWT', async () => {
      mockUserRepository.findOne.mockResolvedValue(testUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validCredentials)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');

      expect(typeof response.body.accessToken).toBe('string');

      expect(response.body.user).toEqual({
        id: userId,
        email: validCredentials.email,
        role: Role.SALES,
      });

      expect(response.body.user).not.toHaveProperty(
        'passwordHash',
      );

      expect(response.body.user).not.toHaveProperty(
        'password',
      );
    });

    it('should return a valid signed JWT', async () => {
      mockUserRepository.findOne.mockResolvedValue(testUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validCredentials)
        .expect(200);

      const payload = jwtService.verify<{
        sub: string;
        email: string;
        role: Role;
      }>(response.body.accessToken);

      expect(payload.sub).toBe(userId);
      expect(payload.email).toBe(validCredentials.email);
      expect(payload.role).toBe(Role.SALES);
    });

    it('should look up the user by email', async () => {
      mockUserRepository.findOne.mockResolvedValue(testUser);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(validCredentials)
        .expect(200);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: validCredentials.email,
        },
      });
    });
  });

  // =========================================================
  // INVALID CREDENTIALS
  // =========================================================

  describe('POST /auth/login - Authentication Failure', () => {
    it('should return 401 for an unknown email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(unknownUserCredentials)
        .expect(401);

      expect(response.body.message).toBe(
        'Invalid credentials',
      );

      expect(response.body).not.toHaveProperty('accessToken');
    });

    it('should return 401 for an incorrect password', async () => {
      mockUserRepository.findOne.mockResolvedValue(testUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(incorrectPasswordCredentials)
        .expect(401);

      expect(response.body.message).toBe(
        'Invalid credentials',
      );

      expect(response.body).not.toHaveProperty('accessToken');
    });

    it('should return identical error messages for invalid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const unknownUserResponse = await request(
        app.getHttpServer(),
      )
        .post('/auth/login')
        .send(unknownUserCredentials)
        .expect(401);

      mockUserRepository.findOne.mockResolvedValue(testUser);

      const incorrectPasswordResponse = await request(
        app.getHttpServer(),
      )
        .post('/auth/login')
        .send(incorrectPasswordCredentials)
        .expect(401);

      expect(unknownUserResponse.body.message).toBe(
        incorrectPasswordResponse.body.message,
      );
    });
  });

  // =========================================================
  // REQUEST VALIDATION
  // =========================================================

  describe('POST /auth/login - Validation', () => {
    it('should reject an empty request body', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });

    it('should reject an invalid email address', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
        })
        .expect(400);
    });

    it('should reject a missing password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: validCredentials.email,
        })
        .expect(400);
    });

    it('should reject additional unexpected fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          ...validCredentials,
          role: Role.ADMIN,
        })
        .expect(400);
    });
  });
});