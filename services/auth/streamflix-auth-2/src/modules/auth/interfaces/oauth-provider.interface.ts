export interface OAuthProviderConfig {
  name: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string[];
  authorizationUrl?: string;
  tokenUrl?: string;
  profileUrl?: string;
  profileFields?: Record<string, string>;
  state?: boolean;
}

export interface OAuthUserProfile {
  id: string;
  provider: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatarUrl?: string;
  rawProfile?: Record<string, any>;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}
