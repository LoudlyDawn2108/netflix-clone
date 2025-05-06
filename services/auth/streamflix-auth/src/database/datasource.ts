import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

// Load environment variables from .env file
dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'streamflix_auth',
  entities: [User, Role, Permission],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false, // Never use synchronize in production!
  logging: process.env.NODE_ENV !== 'production',
  extra: {
    max: parseInt(process.env.DATABASE_POOL_SIZE || '20', 10),
  },
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
