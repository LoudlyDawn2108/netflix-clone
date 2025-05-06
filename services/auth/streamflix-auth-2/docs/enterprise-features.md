# Streamflix Authentication Service - Enterprise Features

This document provides comprehensive documentation for the enterprise integration features available in the Streamflix Authentication Service.

## Table of Contents

1. [Compliance and Audit Features](#compliance-and-audit-features)
2. [LDAP Integration](#ldap-integration)
3. [SAML Integration](#saml-integration)
4. [Multi-Region Deployment](#multi-region-deployment)
5. [Configuration Examples](#configuration-examples)

## Compliance and Audit Features

### Overview

The Compliance and Audit system provides a robust framework for tracking user actions, managing privacy consents, and enabling data export for GDPR compliance. This module is critical for organizations with strict regulatory requirements.

### Key Features

- **Comprehensive Audit Logging**: Track all security-relevant events and user actions
- **Privacy Consent Management**: Record and enforce user consent for privacy policies
- **GDPR Data Export**: Export user data in structured formats for data portability requirements
- **Configurable Data Retention**: Set and enforce retention policies for personal data
- **Compliance Reporting**: Generate reports for regulatory compliance

### API Endpoints

#### Audit Logs

```
GET /api/compliance/audit-logs - List audit logs with filtering
GET /api/compliance/audit-logs/:id - Get specific audit log details
POST /api/compliance/audit-logs - Create a new audit log entry (system use)
```

#### Privacy Consents

```
GET /api/compliance/privacy-consents - List user consents
POST /api/compliance/privacy-consents - Record a new user consent
PUT /api/compliance/privacy-consents/:id - Update consent status
GET /api/compliance/privacy-consents/status/:type - Check if user has consented to specific policy
```

#### Data Exports

```
POST /api/compliance/data-exports - Request a new data export
GET /api/compliance/data-exports - List user's data export requests
GET /api/compliance/data-exports/:id - Get details of specific export request
GET /api/compliance/data-exports/:id/download - Download the exported data
```

### Configuration Options

```typescript
// in enterprise-config.ts
compliance: {
  auditLogRetentionDays: 365, // Days to retain audit logs
  privacyNoticeVersion: '1.0', // Current privacy notice version
  termsVersion: '1.0', // Current terms version
  dataExportRetentionDays: 7, // Days to retain generated exports
  enforceConsentOnLogin: true, // Require consent validation on login
  enableAuditLogging: true, // Enable audit logging
  enablePrivacyFeatures: true // Enable privacy consent and data export
}
```

## LDAP Integration

### Overview

The LDAP integration allows enterprise customers to connect their existing directory services for authentication and user provisioning. This provides a seamless experience for enterprise users while maintaining the security and control of the central directory.

### Key Features

- **Multiple Directory Support**: Configure and connect to multiple LDAP directories
- **User Authentication**: Authenticate users against corporate directories
- **Just-In-Time User Provisioning**: Automatically create user accounts on first login
- **Group Mapping**: Map LDAP groups to application roles
- **User Search**: Search for users in connected directories

### API Endpoints

```
POST /api/auth/ldap/login - Authenticate against LDAP directory
GET /api/auth/ldap/search - Search for users in LDAP directory
GET /api/auth/ldap/directories - List configured LDAP directories
GET /api/auth/ldap/groups/:userId - Get user's LDAP groups
```

### Configuration Options

```typescript
// in enterprise-config.ts
ldap: {
  directories: [
    {
      name: 'corporate', // Friendly name for the directory
      enabled: true, // Whether this directory is active
      url: 'ldap://ldap.example.com', // LDAP server URL
      baseDN: 'dc=example,dc=com', // Base DN for the directory
      bindDN: 'cn=admin,dc=example,dc=com', // Admin bind DN
      bindCredentials: 'admin', // Admin password
      searchBase: 'ou=users,dc=example,dc=com', // Base for user searches
      searchFilter: '(uid={{username}})', // Filter for finding users
      groupSearchBase: 'ou=groups,dc=example,dc=com', // Base for group searches
      groupSearchFilter: '(member={{dn}})', // Filter for finding user's groups

      // Map LDAP attributes to application user properties
      userAttributeMap: {
        uid: 'uid',
        email: 'mail',
        firstName: 'givenName',
        lastName: 'sn',
        displayName: 'displayName',
      },

      // Map LDAP groups to application roles
      groupMappings: {
        'streamflix-admin': 'admin',
        'streamflix-user': 'user',
      },
    },
  ];
}
```

## SAML Integration

### Overview

The SAML integration enables enterprise single sign-on (SSO) capabilities, allowing users to authenticate with their organization's identity provider (IdP). This feature streamlines the login process for enterprise users and enhances security by centralizing authentication.

### Key Features

- **Multiple IdP Support**: Configure and connect to multiple identity providers
- **Metadata Exchange**: Generate and consume SAML metadata for easy setup
- **Just-In-Time User Provisioning**: Automatically create user accounts on first login
- **Attribute Mapping**: Map IdP attributes to user properties
- **Group-based Role Assignment**: Assign roles based on IdP group membership

### API Endpoints

```
GET /api/auth/saml/providers - List available SAML providers
GET /api/auth/saml/login/:provider - Initiate SAML login flow
POST /api/auth/saml/callback/:provider - SAML assertion callback endpoint
GET /api/auth/saml/metadata/:provider - Get SP metadata for IdP configuration
POST /api/auth/saml/logout/:provider - Handle SAML logout requests
```

### Configuration Options

```typescript
// in enterprise-config.ts
saml: {
  providers: [
    {
      name: 'okta', // Provider identifier
      enabled: true, // Whether this provider is active
      displayName: 'Okta SSO', // User-friendly display name
      entryPoint: 'https://example.okta.com/app/example/entrypoint', // IdP SSO URL
      issuer: 'streamflix-auth', // SP entity ID
      cert: 'MIIC...', // IdP X.509 certificate
      audience: 'https://auth.streamflix.com', // Expected audience
      privateKey: '-----BEGIN PRIVATE KEY-----...', // SP private key for signing
      privateCert: '-----BEGIN CERTIFICATE-----...', // SP certificate
      identifierFormat:
        'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',

      // Map SAML attributes to user properties
      attributeMapping: {
        email: 'email',
        firstName: 'firstName',
        lastName: 'lastName',
        displayName: 'displayName',
      },

      // SAML attribute containing group information
      groupAttributeName: 'groups',

      // Map IdP groups to application roles
      groupMapping: {
        'streamflix-admin': 'admin',
        'streamflix-user': 'user',
      },
    },
  ];
}
```

## Multi-Region Deployment

### Overview

The Multi-Region Deployment feature enables globally distributed deployment of the authentication service for high availability and reduced latency. It synchronizes critical authentication data across regions while maintaining session validity regardless of the region a user connects to.

### Key Features

- **Cross-Region Session Synchronization**: Maintain session validity across regions
- **User Data Replication**: Replicate user account changes to all regions
- **Region-Aware Operations**: Direct operations to the appropriate region
- **Failover Support**: Enable seamless region failover for high availability
- **Distributed Event Handling**: Ensure consistent event handling across regions

### API Endpoints

```
GET /api/auth/regions - Get information about available regions
GET /api/auth/regions/status - Check multi-region sync status
POST /api/auth/regions/sync - Manually trigger cross-region synchronization
```

### Configuration Options

```typescript
// in enterprise-config.ts
multiRegion: {
  enabled: true, // Whether multi-region features are active
  region: 'us-east', // Current region identifier
  primaryRegion: 'us-east', // Primary region for write operations
  syncEnabled: true, // Whether to sync data across regions
  replicationEnabled: true, // Whether to replicate data changes
  regions: ['us-east', 'us-west', 'eu-central'], // Available regions
  syncChannel: 'auth-sync' // Redis channel for sync messages
}
```

## Configuration Examples

Below are configuration examples for different enterprise scenarios:

### Basic Enterprise Setup

```dotenv
# General enterprise features
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_RETENTION_DAYS=365
ENFORCE_CONSENT_ON_LOGIN=true
PRIVACY_NOTICE_VERSION=1.0
TERMS_VERSION=1.0

# Single region configuration
MULTI_REGION_ENABLED=false
REGION=default
```

### LDAP Integration

```dotenv
# LDAP Configuration
LDAP_URL=ldap://ldap.example.com
LDAP_BASE_DN=dc=example,dc=com
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_CREDENTIALS=secure_password_here
LDAP_SEARCH_BASE=ou=users,dc=example,dc=com
LDAP_SEARCH_FILTER=(uid={{username}})
LDAP_GROUP_SEARCH_BASE=ou=groups,dc=example,dc=com
LDAP_GROUP_SEARCH_FILTER=(member={{dn}})

# Full LDAP Directory Configuration (JSON)
LDAP_DIRECTORIES=[{"name":"corporate","enabled":true,"url":"ldap://ldap.example.com","baseDN":"dc=example,dc=com","bindDN":"cn=admin,dc=example,dc=com","bindCredentials":"secure_password_here","searchBase":"ou=users,dc=example,dc=com","searchFilter":"(uid={{username}})","groupSearchBase":"ou=groups,dc=example,dc=com","groupSearchFilter":"(member={{dn}})","userAttributeMap":{"uid":"uid","email":"mail","firstName":"givenName","lastName":"sn","displayName":"displayName"},"groupMappings":{"streamflix-admin":"admin","streamflix-user":"user"}}]
```

### SAML Single Sign-On

```dotenv
# SAML Configuration
SAML_ISSUER=streamflix-auth
SAML_AUDIENCE=https://auth.streamflix.com
SAML_OKTA_ENTRY_POINT=https://example.okta.com/app/example/entrypoint
SAML_OKTA_CERT=MIIC...
SAML_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
SAML_PRIVATE_CERT=-----BEGIN CERTIFICATE-----...
SAML_IDENTIFIER_FORMAT=urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress

# Full SAML Provider Configuration (JSON)
SAML_PROVIDERS=[{"name":"okta","enabled":true,"displayName":"Okta SSO","entryPoint":"https://example.okta.com/app/example/entrypoint","issuer":"streamflix-auth","cert":"MIIC...","audience":"https://auth.streamflix.com","privateKey":"-----BEGIN PRIVATE KEY-----...","privateCert":"-----BEGIN CERTIFICATE-----...","identifierFormat":"urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress","attributeMapping":{"email":"email","firstName":"firstName","lastName":"lastName","displayName":"displayName"},"groupAttributeName":"groups","groupMapping":{"streamflix-admin":"admin","streamflix-user":"user"}}]
```

### Multi-Region High Availability

```dotenv
# Multi-Region Configuration
MULTI_REGION_ENABLED=true
REGION=us-east
PRIMARY_REGION=us-east
AVAILABLE_REGIONS=us-east,us-west,eu-central
MULTI_REGION_SYNC_ENABLED=true
MULTI_REGION_REPLICATION_ENABLED=true
MULTI_REGION_SYNC_CHANNEL=auth-sync

# Redis for multi-region synchronization
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password
REDIS_DB=0
```

### Full Enterprise Configuration

```dotenv
# --- Compliance and Audit ---
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_RETENTION_DAYS=730
PRIVACY_NOTICE_VERSION=2.1
TERMS_VERSION=3.0
DATA_EXPORT_RETENTION_DAYS=14
ENFORCE_CONSENT_ON_LOGIN=true
ENABLE_PRIVACY_FEATURES=true

# --- LDAP Integration ---
LDAP_DIRECTORIES=[{"name":"corporate","enabled":true,"url":"ldap://ldap.example.com","baseDN":"dc=example,dc=com","bindDN":"cn=admin,dc=example,dc=com","bindCredentials":"secure_password_here","searchBase":"ou=users,dc=example,dc=com","searchFilter":"(uid={{username}})","groupSearchBase":"ou=groups,dc=example,dc=com","groupSearchFilter":"(member={{dn}})","userAttributeMap":{"uid":"uid","email":"mail","firstName":"givenName","lastName":"sn","displayName":"displayName"},"groupMappings":{"streamflix-admin":"admin","streamflix-user":"user"}}]

# --- SAML SSO ---
SAML_PROVIDERS=[{"name":"okta","enabled":true,"displayName":"Okta SSO","entryPoint":"https://example.okta.com/app/example/entrypoint","issuer":"streamflix-auth","cert":"MIIC...","audience":"https://auth.streamflix.com","privateKey":"-----BEGIN PRIVATE KEY-----...","privateCert":"-----BEGIN CERTIFICATE-----...","identifierFormat":"urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress","attributeMapping":{"email":"email","firstName":"firstName","lastName":"lastName","displayName":"displayName"},"groupAttributeName":"groups","groupMapping":{"streamflix-admin":"admin","streamflix-user":"user"}}]

# --- Multi-Region HA ---
MULTI_REGION_ENABLED=true
REGION=us-east
PRIMARY_REGION=us-east
AVAILABLE_REGIONS=us-east,us-west,eu-central,ap-southeast
MULTI_REGION_SYNC_ENABLED=true
MULTI_REGION_REPLICATION_ENABLED=true
MULTI_REGION_SYNC_CHANNEL=auth-sync

# Redis for sessions and synchronization
REDIS_HOST=redis-cluster.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password
REDIS_DB=0
```
