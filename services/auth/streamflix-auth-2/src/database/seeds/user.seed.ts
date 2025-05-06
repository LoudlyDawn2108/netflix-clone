import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../modules/users/enums/user-role.enum';
import { User } from '../../modules/users/entities/user.entity';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const seedUsers = async (dataSource: DataSource): Promise<void> => {
  const userRepository = dataSource.getRepository(User);

  // Check if admin user already exists
  const adminCount = await userRepository.count({
    where: {
      role: UserRole.ADMIN,
    },
  });

  if (adminCount === 0) {
    // Create admin user if none exists
    console.log('Creating admin user...');

    // Hash the password
    const hashRounds = parseInt(process.env.PASSWORD_HASH_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash('Admin123!', hashRounds);

    // Create the admin user
    const admin = userRepository.create({
      email: 'admin@streamflix.com',
      password: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      emailVerified: true,
      isActive: true,
    });

    await userRepository.save(admin);
    console.log('Admin user created successfully.');
  } else {
    console.log('Admin user already exists. Skipping seed.');
  }

  // Create a regular test user if none exists
  const testUserCount = await userRepository.count({
    where: {
      email: 'user@streamflix.com',
    },
  });

  if (testUserCount === 0) {
    console.log('Creating test user...');

    // Hash the password
    const hashRounds = parseInt(process.env.PASSWORD_HASH_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash('Password123!', hashRounds);

    // Create the test user
    const testUser = userRepository.create({
      email: 'user@streamflix.com',
      password: passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
      emailVerified: true,
      isActive: true,
    });

    await userRepository.save(testUser);
    console.log('Test user created successfully.');
  } else {
    console.log('Test user already exists. Skipping seed.');
  }
};
