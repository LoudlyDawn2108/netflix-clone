export default () => ({
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'streamflix',
    schema: process.env.DB_SCHEMA || 'public',
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOGGING === 'true',
    connectionPoolSize: parseInt(
      process.env.DB_CONNECTION_POOL_SIZE || '20',
      10,
    ),
    // Migration settings
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
    seedDatabase: process.env.DB_SEED === 'true',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ttl: parseInt(process.env.REDIS_TTL || '86400', 10), // 24 hours
    maxItems: parseInt(process.env.REDIS_MAX_ITEMS || '1000', 10),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'streamflix-super-secret',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'streamflix-refresh-secret',
    accessExpirationSec: parseInt(
      process.env.JWT_ACCESS_EXPIRATION || '3600',
      10,
    ), // 1 hour
    refreshExpirationSec: parseInt(
      process.env.JWT_REFRESH_EXPIRATION || '604800',
      10,
    ), // 7 days
  },

  // Security
  security: {
    bcryptSalt: process.env.BCRYPT_SALT || '$2b$12$gPb/ySqF5lWs9OfIJ3KVfO',
    passwordHashRounds: parseInt(process.env.PASSWORD_HASH_ROUNDS || '12', 10),
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    maxFailedLoginAttempts: parseInt(
      process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5',
      10,
    ),
    accountLockoutMinutes: parseInt(
      process.env.ACCOUNT_LOCKOUT_MINUTES || '15',
      10,
    ),
    sessionTtl: parseInt(process.env.SESSION_TTL || '86400', 10), // 24 hours
    csrfEnabled: process.env.CSRF_ENABLED !== 'false', // Enabled by default
    csrfCookieName: process.env.CSRF_COOKIE_NAME || 'XSRF-TOKEN',
    csrfHeaderName: process.env.CSRF_HEADER_NAME || 'X-XSRF-TOKEN',
    corsEnabled: process.env.CORS_ENABLED !== 'false', // Enabled by default
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000'],
    rateLimitByIp: process.env.RATE_LIMIT_BY_IP !== 'false', // Enabled by default

    // Password policy settings
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    passwordRequireUppercase:
      process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    passwordRequireLowercase:
      process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    passwordRequireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
    passwordRequireSpecialChars:
      process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
    passwordHistorySize: parseInt(process.env.PASSWORD_HISTORY_SIZE || '5', 10),
    maxPasswordAge: parseInt(process.env.MAX_PASSWORD_AGE || '90', 10), // 90 days
  },

  // OAuth Configuration
  oauth: {
    // Base URL for all OAuth callbacks
    baseCallbackUrl:
      process.env.OAUTH_BASE_CALLBACK_URL || 'http://localhost:3000/api/auth',

    // Google OAuth settings
    google: {
      enabled: process.env.OAUTH_GOOGLE_ENABLED !== 'false',
      clientId: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
      callbackUrl:
        process.env.OAUTH_GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/api/auth/google/callback',
    },

    // GitHub OAuth settings
    github: {
      enabled: process.env.OAUTH_GITHUB_ENABLED !== 'false',
      clientId: process.env.OAUTH_GITHUB_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET || '',
      callbackUrl:
        process.env.OAUTH_GITHUB_CALLBACK_URL ||
        'http://localhost:3000/api/auth/github/callback',
    },
  },
});
