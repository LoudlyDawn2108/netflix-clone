import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment;

  @IsNumber()
  @IsOptional()
  PORT: number;

  @IsString()
  @IsOptional()
  API_PREFIX: string;

  @IsString()
  @IsOptional()
  DB_HOST: string;

  @IsNumber()
  @IsOptional()
  DB_PORT: number;

  @IsString()
  @IsOptional()
  DB_USERNAME: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD: string;

  @IsString()
  @IsOptional()
  DB_DATABASE: string;

  @IsString()
  @IsOptional()
  DB_SCHEMA: string;

  @IsString()
  @IsOptional()
  DB_SYNC: string;

  @IsString()
  @IsOptional()
  DB_LOGGING: string;

  @IsNumber()
  @IsOptional()
  DB_CONNECTION_POOL_SIZE: number;

  @IsString()
  @IsOptional()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string;

  @IsNumber()
  @IsOptional()
  JWT_ACCESS_EXPIRATION: number;

  @IsNumber()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: number;

  @IsString()
  @IsOptional()
  BCRYPT_SALT: string;

  @IsNumber()
  @IsOptional()
  PASSWORD_HASH_ROUNDS: number;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_TTL: number;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_MAX: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        if (error.constraints) {
          return Object.values(error.constraints).join(', ');
        }
        return 'Validation error';
      })
      .join('\n');
    throw new Error(`Config validation error: ${errorMessages}`);
  }
  return validatedConfig;
}
