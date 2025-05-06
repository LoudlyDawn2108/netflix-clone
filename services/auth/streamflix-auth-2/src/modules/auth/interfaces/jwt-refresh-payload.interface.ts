export interface JwtRefreshPayload {
  sub: string; // User ID
  refreshTokenId: string;
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
}
