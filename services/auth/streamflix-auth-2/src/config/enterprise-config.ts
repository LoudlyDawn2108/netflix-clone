import { registerAs } from '@nestjs/config';

export default registerAs('enterprise', () => ({
  // SAML Configuration
  saml: {
    providers: process.env.SAML_PROVIDERS
      ? JSON.parse(process.env.SAML_PROVIDERS)
      : [
          {
            name: 'okta',
            enabled: false,
            displayName: 'Okta SSO',
            entryPoint: process.env.SAML_OKTA_ENTRY_POINT || '',
            issuer: process.env.SAML_ISSUER || 'streamflix-auth',
            cert: process.env.SAML_OKTA_CERT || '',
            audience: process.env.SAML_AUDIENCE || '',
            privateKey: process.env.SAML_PRIVATE_KEY || '',
            privateCert: process.env.SAML_PRIVATE_CERT || '',
            identifierFormat:
              process.env.SAML_IDENTIFIER_FORMAT ||
              'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
            attributeMapping: {
              email: 'email',
              firstName: 'firstName',
              lastName: 'lastName',
              displayName: 'displayName',
            },
            groupAttributeName: 'groups',
            groupMapping: {
              'streamflix-admin': 'admin',
              'streamflix-user': 'user',
            },
          },
        ],
  },

  // OIDC Configuration
  oidc: {
    keysDir: process.env.OIDC_KEYS_DIR || './keys',
    clients: process.env.OIDC_CLIENTS
      ? JSON.parse(process.env.OIDC_CLIENTS)
      : [
          {
            clientId: 'streamflix-web-client',
            clientSecret:
              process.env.OIDC_DEFAULT_CLIENT_SECRET ||
              'default-secret-change-me',
            name: 'Streamflix Web Client',
            redirectUris: ['http://localhost:3000/auth/callback'],
            allowedScopes: ['openid', 'profile', 'email'],
            tokenEndpointAuthMethod: 'client_secret_basic',
            grantTypes: ['authorization_code', 'refresh_token'],
            responseTypes: ['code'],
          },
        ],
  },

  // LDAP Configuration
  ldap: {
    directories: process.env.LDAP_DIRECTORIES
      ? JSON.parse(process.env.LDAP_DIRECTORIES)
      : [
          {
            name: 'corporate',
            enabled: false,
            url: process.env.LDAP_URL || 'ldap://ldap.example.com',
            baseDN: process.env.LDAP_BASE_DN || 'dc=example,dc=com',
            bindDN: process.env.LDAP_BIND_DN || 'cn=admin,dc=example,dc=com',
            bindCredentials: process.env.LDAP_BIND_CREDENTIALS || 'admin',
            searchBase:
              process.env.LDAP_SEARCH_BASE || 'ou=users,dc=example,dc=com',
            searchFilter:
              process.env.LDAP_SEARCH_FILTER || '(uid={{username}})',
            groupSearchBase:
              process.env.LDAP_GROUP_SEARCH_BASE ||
              'ou=groups,dc=example,dc=com',
            groupSearchFilter:
              process.env.LDAP_GROUP_SEARCH_FILTER || '(member={{dn}})',
            userAttributeMap: {
              uid: 'uid',
              email: 'mail',
              firstName: 'givenName',
              lastName: 'sn',
              displayName: 'displayName',
            },
            groupMappings: {
              'streamflix-admin': 'admin',
              'streamflix-user': 'user',
            },
          },
        ],
  },

  // Compliance and Audit Configuration
  compliance: {
    auditLogRetentionDays: parseInt(
      process.env.AUDIT_LOG_RETENTION_DAYS || '365',
      10,
    ),
    privacyNoticeVersion: process.env.PRIVACY_NOTICE_VERSION || '1.0',
    termsVersion: process.env.TERMS_VERSION || '1.0',
    dataExportRetentionDays: parseInt(
      process.env.DATA_EXPORT_RETENTION_DAYS || '7',
      10,
    ),
    enforceConsentOnLogin: process.env.ENFORCE_CONSENT_ON_LOGIN === 'true',
    enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
    enablePrivacyFeatures: process.env.ENABLE_PRIVACY_FEATURES !== 'false',
  },

  // Multi-Region Configuration
  multiRegion: {
    enabled: process.env.MULTI_REGION_ENABLED === 'true',
    region: process.env.REGION || 'default',
    primaryRegion: process.env.PRIMARY_REGION || 'default',
    syncEnabled: process.env.MULTI_REGION_SYNC_ENABLED === 'true',
    replicationEnabled: process.env.MULTI_REGION_REPLICATION_ENABLED === 'true',
    regions: process.env.AVAILABLE_REGIONS
      ? process.env.AVAILABLE_REGIONS.split(',')
      : [process.env.REGION || 'default'],
    syncChannel: process.env.MULTI_REGION_SYNC_CHANNEL || 'auth-sync',
  },
}));
