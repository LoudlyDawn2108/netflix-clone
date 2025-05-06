import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ldap from 'ldapjs';
import { promisify } from 'util';
import { UsersService } from '../../users/users.service';
import { EventsService } from '../../events/events.service';

interface LdapConfig {
  url: string;
  baseDN: string;
  bindDN: string;
  bindCredentials: string;
  searchBase: string;
  searchFilter: string;
  groupSearchBase?: string;
  groupSearchFilter?: string;
  groupMemberAttribute?: string;
  userAttributeMap?: Record<string, string>;
  groupAttributeMap?: Record<string, string>;
  tlsOptions?: {
    rejectUnauthorized: boolean;
    ca?: string;
  };
}

interface LdapUser {
  dn: string;
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string[];
  [key: string]: any;
}

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);
  private readonly ldapConfigs: Map<string, LdapConfig> = new Map();
  private readonly clients: Map<string, ldap.Client> = new Map();
  private readonly defaultAttributeMap = {
    uid: 'uid',
    email: 'mail',
    firstName: 'givenName',
    lastName: 'sn',
    displayName: 'displayName',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
  ) {
    this.initializeConfigs();
  }

  /**
   * Initialize LDAP configurations from environment/config
   */
  private initializeConfigs(): void {
    const ldapConfigs = this.configService.get('ldap.directories') || [];

    if (!ldapConfigs.length) {
      this.logger.log('No LDAP directories configured');
      return;
    }

    for (const config of ldapConfigs) {
      try {
        this.ldapConfigs.set(config.name, {
          url: config.url,
          baseDN: config.baseDN,
          bindDN: config.bindDN,
          bindCredentials: config.bindCredentials,
          searchBase: config.searchBase || config.baseDN,
          searchFilter: config.searchFilter || '(uid={{username}})',
          groupSearchBase: config.groupSearchBase,
          groupSearchFilter: config.groupSearchFilter || '(member={{dn}})',
          groupMemberAttribute: config.groupMemberAttribute || 'member',
          userAttributeMap: {
            ...this.defaultAttributeMap,
            ...config.userAttributeMap,
          },
          groupAttributeMap: {
            name: 'cn',
            description: 'description',
            ...config.groupAttributeMap,
          },
          tlsOptions: config.tlsOptions,
        });

        this.logger.log(`Configured LDAP directory: ${config.name}`);
      } catch (error) {
        this.logger.error(
          `Failed to configure LDAP directory ${config.name}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Get a connected LDAP client
   */
  private async getClient(directoryName: string): Promise<ldap.Client> {
    if (this.clients.has(directoryName)) {
      return this.clients.get(directoryName);
    }

    const config = this.ldapConfigs.get(directoryName);

    if (!config) {
      throw new Error(`LDAP directory not found: ${directoryName}`);
    }

    const client = ldap.createClient({
      url: config.url,
      tlsOptions: config.tlsOptions,
    });

    // Promisify bind method
    const bindAsync = promisify(client.bind).bind(client);

    try {
      await bindAsync(config.bindDN, config.bindCredentials);
      this.clients.set(directoryName, client);

      client.on('error', (err) => {
        this.logger.error(
          `LDAP client error for ${directoryName}: ${err.message}`,
          err.stack,
        );
        this.clients.delete(directoryName);
      });

      return client;
    } catch (error) {
      this.logger.error(
        `Failed to bind to LDAP directory ${directoryName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Authenticate a user against LDAP directory
   */
  async authenticate(
    directoryName: string,
    username: string,
    password: string,
  ): Promise<LdapUser | null> {
    try {
      const config = this.ldapConfigs.get(directoryName);

      if (!config) {
        throw new Error(`LDAP directory not found: ${directoryName}`);
      }

      // First, find the user in LDAP
      const user = await this.findUser(directoryName, username);

      if (!user) {
        this.logger.warn(`User not found in LDAP: ${username}`);
        return null;
      }

      // Create a new client specifically for this authentication
      const client = ldap.createClient({
        url: config.url,
        tlsOptions: config.tlsOptions,
      });

      const bindAsync = promisify(client.bind).bind(client);

      try {
        // Try to bind as the user
        await bindAsync(user.dn, password);

        // If successful, get user's groups
        if (config.groupSearchBase) {
          user.groups = await this.getUserGroups(directoryName, user);
        }

        client.unbind();
        return user;
      } catch (error) {
        this.logger.warn(
          `Authentication failed for user ${username}: ${error.message}`,
        );
        client.unbind();
        return null;
      }
    } catch (error) {
      this.logger.error(
        `LDAP authentication error: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Find a user in the LDAP directory
   */
  async findUser(
    directoryName: string,
    username: string,
  ): Promise<LdapUser | null> {
    try {
      const client = await this.getClient(directoryName);
      const config = this.ldapConfigs.get(directoryName);

      // Create search filter by replacing {{username}} in the template
      const filter = config.searchFilter.replace(
        /{{username}}/g,
        ldap.escape(username),
      );

      // Define which attributes to retrieve
      const attributes = Object.values(config.userAttributeMap);

      const searchAsync = promisify(client.search).bind(client);

      const result = await searchAsync(config.searchBase, {
        filter,
        scope: 'sub',
        attributes,
      });

      let user: LdapUser = null;

      // Process search results
      result.on('searchEntry', (entry) => {
        const userData: Record<string, any> = {};
        const attrMap = config.userAttributeMap;

        userData.dn = entry.objectName;

        // Map LDAP attributes to our user structure
        for (const [key, ldapAttr] of Object.entries(attrMap)) {
          const attr = entry.attributes.find((a) => a.type === ldapAttr);

          if (attr) {
            userData[key] = attr.vals[0].toString();
          }
        }

        // Ensure we have uid and email
        if (userData.uid && userData.email) {
          user = userData as LdapUser;
        }
      });

      // Wait for search to complete
      await new Promise((resolve, reject) => {
        result.on('error', reject);
        result.on('end', resolve);
      });

      return user;
    } catch (error) {
      this.logger.error(
        `Error finding LDAP user ${username}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Get a user's groups from LDAP
   */
  private async getUserGroups(
    directoryName: string,
    user: LdapUser,
  ): Promise<string[]> {
    try {
      const client = await this.getClient(directoryName);
      const config = this.ldapConfigs.get(directoryName);

      if (!config.groupSearchBase) {
        return [];
      }

      // Create search filter by replacing {{dn}} in the template
      const filter = config.groupSearchFilter.replace(
        /{{dn}}/g,
        ldap.escape(user.dn),
      );

      const searchAsync = promisify(client.search).bind(client);

      const result = await searchAsync(config.groupSearchBase, {
        filter,
        scope: 'sub',
        attributes: ['cn'],
      });

      const groups: string[] = [];

      // Process search results
      result.on('searchEntry', (entry) => {
        const cnAttr = entry.attributes.find((a) => a.type === 'cn');

        if (cnAttr && cnAttr.vals && cnAttr.vals.length) {
          groups.push(cnAttr.vals[0].toString());
        }
      });

      // Wait for search to complete
      await new Promise((resolve, reject) => {
        result.on('error', reject);
        result.on('end', resolve);
      });

      return groups;
    } catch (error) {
      this.logger.error(
        `Error getting LDAP groups for user ${user.dn}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Authenticate and provision user from LDAP (JIT)
   */
  async authenticateAndProvision(
    directoryName: string,
    username: string,
    password: string,
  ): Promise<{ user: any; isNewUser: boolean }> {
    try {
      // Authenticate against LDAP
      const ldapUser = await this.authenticate(
        directoryName,
        username,
        password,
      );

      if (!ldapUser) {
        return null;
      }

      // Check if user exists in our system
      let user = await this.usersService.findByEmail(ldapUser.email);
      let isNewUser = false;

      if (!user) {
        // User does not exist, create it (Just-In-Time provisioning)
        isNewUser = true;

        const userData = {
          email: ldapUser.email,
          firstName: ldapUser.firstName,
          lastName: ldapUser.lastName,
          displayName:
            ldapUser.displayName ||
            `${ldapUser.firstName} ${ldapUser.lastName}`,
          emailVerified: true, // Trust LDAP directory for email verification
          externalId: `ldap:${directoryName}:${ldapUser.uid}`,
          isExternal: true,
          // Don't set password for LDAP users
        };

        user = await this.usersService.create(userData);

        // Emit user registration event
        await this.eventsService.emitUserRegistered(user, {
          source: `ldap:${directoryName}`,
          isJIT: true,
        });
      }

      // Map LDAP groups to roles if configured
      if (ldapUser.groups && ldapUser.groups.length > 0) {
        const config =
          this.configService.get(
            `ldap.directories.${directoryName}.groupMappings`,
          ) || {};
        const rolesToAssign = [];

        for (const group of ldapUser.groups) {
          if (config[group]) {
            rolesToAssign.push(config[group]);
          }
        }

        if (rolesToAssign.length > 0) {
          await this.usersService.assignRoles(user.id, rolesToAssign);
        }
      }

      // Emit login event
      await this.eventsService.emitUserLoggedIn(user, {
        method: `ldap:${directoryName}`,
        jit: isNewUser,
      });

      return { user, isNewUser };
    } catch (error) {
      this.logger.error(
        `LDAP authentication and provisioning error: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Search for users in LDAP directory
   */
  async searchUsers(
    directoryName: string,
    searchTerm: string,
    limit: number = 20,
  ): Promise<LdapUser[]> {
    try {
      const client = await this.getClient(directoryName);
      const config = this.ldapConfigs.get(directoryName);

      // Create search filter
      const filter = `(&(objectClass=person)(|(uid=*${ldap.escape(searchTerm)}*)(mail=*${ldap.escape(searchTerm)}*)(cn=*${ldap.escape(searchTerm)}*)))`;

      // Define which attributes to retrieve
      const attributes = Object.values(config.userAttributeMap);

      const searchAsync = promisify(client.search).bind(client);

      const result = await searchAsync(config.searchBase, {
        filter,
        scope: 'sub',
        attributes,
        sizeLimit: limit,
      });

      const users: LdapUser[] = [];

      // Process search results
      result.on('searchEntry', (entry) => {
        const userData: Record<string, any> = {};
        const attrMap = config.userAttributeMap;

        userData.dn = entry.objectName;

        // Map LDAP attributes to our user structure
        for (const [key, ldapAttr] of Object.entries(attrMap)) {
          const attr = entry.attributes.find((a) => a.type === ldapAttr);

          if (attr) {
            userData[key] = attr.vals[0].toString();
          }
        }

        // Only add users with at least uid and email
        if (userData.uid && userData.email) {
          users.push(userData as LdapUser);
        }
      });

      // Wait for search to complete
      await new Promise((resolve, reject) => {
        result.on('error', reject);
        result.on('end', resolve);
      });

      return users;
    } catch (error) {
      this.logger.error(
        `Error searching LDAP users: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get available LDAP directories
   */
  getAvailableDirectories(): string[] {
    return Array.from(this.ldapConfigs.keys());
  }
}
