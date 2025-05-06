import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as speakeasy from 'speakeasy';

describe('MFA Authentication (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let accessToken: string;
  let testUser: User;
  let mfaSecret: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userRepository = app.get(getRepositoryToken(User));

    // Create a test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = userRepository.create({
      id: uuidv4(),
      email: `test-mfa-${Date.now()}@example.com`,
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
    });

    await userRepository.save(testUser);

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'Password123!',
      });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test user
    await userRepository.delete(testUser.id);
    await app.close();
  });

  describe('MFA Setup Flow', () => {
    it('should initialize MFA setup', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/mfa/init')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          mfaType: 'totp',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.secret).toBeDefined();
      expect(response.body.qrCodeUrl).toBeDefined();

      // Save the secret for later tests
      mfaSecret = response.body.secret;
    });

    it('should verify and enable MFA', async () => {
      // Generate a valid TOTP code using the secret
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/mfa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          code: token,
          mfaType: 'totp',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.backupCodes).toBeDefined();
      expect(response.body.backupCodes.length).toBe(10);

      // Verify the user now has MFA enabled
      const updatedUser = await userRepository.findOne({
        where: { id: testUser.id },
      });
      expect(updatedUser.mfaEnabled).toBeTruthy();
    });

    it('should require MFA during login when enabled', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'Password123!',
        });

      // Check that login doesn't return tokens but requires MFA
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.mfaRequired).toBeTruthy();
      expect(loginResponse.body.userId).toBe(testUser.id);
      expect(loginResponse.body.accessToken).toBeUndefined();
    });

    it('should validate MFA token and complete login', async () => {
      // Get the updated user with MFA secret
      const updatedUser = await userRepository.findOne({
        where: { id: testUser.id },
      });

      // Generate a valid TOTP code
      const token = speakeasy.totp({
        secret: updatedUser.mfaSecret,
        encoding: 'base32',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/mfa/validate')
        .send({
          userId: testUser.id,
          code: token,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should disable MFA', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/mfa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();

      // Verify MFA is disabled
      const updatedUser = await userRepository.findOne({
        where: { id: testUser.id },
      });
      expect(updatedUser.mfaEnabled).toBeFalsy();
    });

    it('should not require MFA during login after disabling', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'Password123!',
        });

      // Check that login returns tokens directly
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.accessToken).toBeDefined();
      expect(loginResponse.body.refreshToken).toBeDefined();
      expect(loginResponse.body.mfaRequired).toBeFalsy();
    });
  });
});
