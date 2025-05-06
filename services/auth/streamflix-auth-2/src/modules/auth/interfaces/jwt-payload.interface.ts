export interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
}
