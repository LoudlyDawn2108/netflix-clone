import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { IpSecurity } from '../src/modules/users/entities/ip-security.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../src/modules/users/enums/user-role.enum';

describe('IP Security (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let ipSecurityRepository: Repository<IpSecurity>;
  let regularUserAccessToken: string;
  let adminAccessToken: string;
  let testUser: User;
  let adminUser: User;

  // Test IP addresses
  const testIpWhitelist = '192.168.1.1';
  const testIpBlacklist = '10.0.0.1';
  const testIpGlobalBlacklist = '1.2.3.4';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userRepository = app.get(getRepositoryToken(User));
    ipSecurityRepository = app.get(getRepositoryToken(IpSecurity));

    // Create a regular test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = userRepository.create({
      id: uuidv4(),
      email: `test-ip-security-${Date.now()}@example.com`,
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
      role: UserRole.USER,
    });

    await userRepository.save(testUser);

    // Create an admin user for testing admin-only features
    adminUser = userRepository.create({
      id: uuidv4(),
      email: `admin-ip-security-${Date.now()}@example.com`,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
      role: UserRole.ADMIN,
    });

    await userRepository.save(adminUser);

    // Login to get access tokens
    const regularLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'Password123!',
      });

    regularUserAccessToken = regularLoginResponse.body.accessToken;

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: adminUser.email,
        password: 'Password123!',
      });

    adminAccessToken = adminLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await ipSecurityRepository.delete({ userId: testUser.id });
    await ipSecurityRepository.delete({ userId: adminUser.id });
    await ipSecurityRepository.delete({ userId: null }); // Global rules
    await userRepository.delete(testUser.id);
    await userRepository.delete(adminUser.id);
    await app.close();
  });

  describe('IP Security Management Flow', () => {
    it('should add an IP to user whitelist', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/ip-security/whitelist')
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .send({
          ipAddress: testIpWhitelist,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.entry).toBeDefined();
      expect(response.body.entry.ipAddress).toBe(testIpWhitelist);
      expect(response.body.entry.type).toBe('whitelist');
    });

    it('should add an IP to user blacklist', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/ip-security/blacklist')
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .send({
          ipAddress: testIpBlacklist,
          reason: 'Testing blacklist',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.entry).toBeDefined();
      expect(response.body.entry.ipAddress).toBe(testIpBlacklist);
      expect(response.body.entry.type).toBe('blacklist');
      expect(response.body.entry.reason).toBe('Testing blacklist');
    });

    it('should get user IP security settings', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/ip-security')
        .set('Authorization', `Bearer ${regularUserAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.whitelist).toBeDefined();
      expect(response.body.blacklist).toBeDefined();
      expect(response.body.whitelist.length).toBe(1);
      expect(response.body.blacklist.length).toBe(1);
      expect(response.body.whitelist[0].ipAddress).toBe(testIpWhitelist);
      expect(response.body.blacklist[0].ipAddress).toBe(testIpBlacklist);
    });

    it('should remove an IP from security list', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/auth/ip-security/${testIpWhitelist}`)
        .set('Authorization', `Bearer ${regularUserAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();

      // Verify IP is removed
      const ipSecurity = await ipSecurityRepository.findOne({
        where: {
          userId: testUser.id,
          ipAddress: testIpWhitelist,
          isActive: true,
        },
      });

      expect(ipSecurity).toBeNull();
    });

    it('should add an IP to global blacklist (admin only)', async () => {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1); // Expire in one month

      const response = await request(app.getHttpServer())
        .post('/auth/admin/ip-security/blacklist')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          ipAddress: testIpGlobalBlacklist,
          reason: 'Testing global blacklist',
          expiresAt: expirationDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.entry).toBeDefined();
      expect(response.body.entry.ipAddress).toBe(testIpGlobalBlacklist);
      expect(response.body.entry.type).toBe('blacklist');
      expect(response.body.entry.userId).toBeNull(); // Global rule

      // Verify expiry date was set
      const date1 = new Date(response.body.entry.expiresAt);
      const date2 = new Date(expirationDate);
      expect(date1.getFullYear()).toBe(date2.getFullYear());
      expect(date1.getMonth()).toBe(date2.getMonth());
      expect(date1.getDate()).toBe(date2.getDate());
    });

    it('should reject global blacklist requests from regular users', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/admin/ip-security/blacklist')
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .send({
          ipAddress: '5.6.7.8',
          reason: 'This should fail',
        });

      expect(response.status).toBe(403); // Forbidden
    });
  });
});
