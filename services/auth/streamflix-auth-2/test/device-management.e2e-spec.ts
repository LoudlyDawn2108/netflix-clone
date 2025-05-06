import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { TrustedDevice } from '../src/modules/users/entities/trusted-device.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

describe('Device Management (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let deviceRepository: Repository<TrustedDevice>;
  let accessToken: string;
  let testUser: User;
  let deviceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userRepository = app.get(getRepositoryToken(User));
    deviceRepository = app.get(getRepositoryToken(TrustedDevice));

    // Create a test user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    testUser = userRepository.create({
      id: uuidv4(),
      email: `test-device-${Date.now()}@example.com`,
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

    // The login should have automatically created a device
    const devices = await deviceRepository.find({
      where: { userId: testUser.id },
    });
    expect(devices.length).toBeGreaterThan(0);
    deviceId = devices[0].id;
  });

  afterAll(async () => {
    // Clean up test user and devices
    await deviceRepository.delete({ userId: testUser.id });
    await userRepository.delete(testUser.id);
    await app.close();
  });

  describe('Device Management Flow', () => {
    it('should get all user devices', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/devices')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.devices).toBeDefined();
      expect(response.body.devices.length).toBeGreaterThan(0);
      expect(response.body.devices[0].id).toBe(deviceId);
    });

    it('should update device name', async () => {
      const deviceName = 'My Test Device';

      const response = await request(app.getHttpServer())
        .patch(`/auth/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: deviceName,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();
      expect(response.body.message).toBe('Device updated successfully');

      // Verify device name was updated
      const updatedDevice = await deviceRepository.findOne({
        where: { id: deviceId },
      });
      expect(updatedDevice.name).toBe(deviceName);
    });

    it('should update device trust level', async () => {
      const trustLevel = 'high';

      const response = await request(app.getHttpServer())
        .patch(`/auth/devices/${deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          trustLevel,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();

      // Verify trust level was updated
      const updatedDevice = await deviceRepository.findOne({
        where: { id: deviceId },
      });
      expect(updatedDevice.trustLevel).toBe(trustLevel);
    });

    it('should create new device on new login', async () => {
      // Count devices before
      const beforeDevices = await deviceRepository.find({
        where: { userId: testUser.id },
      });
      const countBefore = beforeDevices.length;

      // Login again to create another device
      await request(app.getHttpServer()).post('/auth/login').send({
        email: testUser.email,
        password: 'Password123!',
      });

      // Count devices after
      const afterDevices = await deviceRepository.find({
        where: { userId: testUser.id },
      });
      expect(afterDevices.length).toBe(countBefore + 1);
    });

    it('should revoke a device', async () => {
      // Get all devices
      const devices = await deviceRepository.find({
        where: { userId: testUser.id },
      });

      // Choose a device different from the current one
      const deviceToRevoke =
        devices.find((d) => d.id !== deviceId) || devices[0];

      const response = await request(app.getHttpServer())
        .delete(`/auth/devices/${deviceToRevoke.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBeTruthy();

      // Verify device was revoked
      const updatedDevice = await deviceRepository.findOne({
        where: { id: deviceToRevoke.id },
      });
      expect(updatedDevice.isActive).toBeFalsy();
    });
  });
});
