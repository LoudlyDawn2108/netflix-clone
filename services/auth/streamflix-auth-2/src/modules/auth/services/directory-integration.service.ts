import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ldap from 'ldapjs';
import { UsersService } from '../../users/users.service';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../users/entities/user.entity';
import { EventsService } from '../../events/events.service';

interface DirectoryConfig {
  url: string;
  bindDN: string;
  bindCredentials: string;
  searchBase: string;
  searchFilter: string;
  attributes: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    groups: string;
  };
  groupMappings: Record<string, string>;
  syncSchedule: string;
  connectionTimeout: number;
  connectionRetries: number;
  groupSearchBase: string;
  groupSearchFilter: string;
  groupMemberAttribute: string;
}

@Injectable()
export class DirectoryIntegrationService {
  private readonly logger = new Logger(DirectoryIntegrationService.name);
  private directoryConfigs: Map<string, DirectoryConfig> = new Map();
  private clients: Map<string, any> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly eventsService: EventsService,
  ) {
    this.initializeDirectories();
  }

  /**
   * Initialize directory connections based on configuration
   */
  private initializeDirectories() {
    const directoriesConfig = this.configService.get('directories') || {};

    // Load all directory configurations
    for (const [name, config] of Object.entries(directoriesConfig)) {
      this.directoryConfigs.set(name, config as DirectoryConfig);
      this.logger.log(`Loaded directory configuration for: ${name}`);

      // Initialize client
      this.createClient(name);

      // Set up automatic synchronization if configured
      if (config['syncSchedule']) {
        this.setupAutoSync(name, config['syncSchedule']);
      }
    }
  }

  /**
   * Create LDAP client for a directory
   */
  private createClient(directoryName: string): ldap.Client {
    const config = this.directoryConfigs.get(directoryName);

    if (!config) {
      throw new Error(`Directory ${directoryName} not found`);
    }

    const client = ldap.createClient({
      url: config.url,
      timeout: config.connectionTimeout || 5000,
      connectTimeout: config.connectionTimeout || 5000,
      reconnect: {
        initialDelay: 1000,
        maxDelay: 10000,
        failAfter: config.connectionRetries || 10,
      },
    });

    // Set up event handlers
    client.on('error', (err) => {
      this.logger.error(
        `LDAP client error for ${directoryName}: ${err.message}`,
      );
    });

    client.on('connectError', (err) => {
      this.logger.error(
        `LDAP connection error for ${directoryName}: ${err.message}`,
      );
    });

    client.on('connect', () => {
      this.logger.log(`LDAP connected successfully to ${directoryName}`);
    });

    // Store client for reuse
    this.clients.set(directoryName, client);

    return client;
  }

  /**
   * Set up automatic synchronization on schedule
   */
  private setupAutoSync(directoryName: string, schedule: string) {
    // Simple implementation - can be enhanced with cron-like scheduling
    const intervalMs = this.parseScheduleToMs(schedule);

    if (intervalMs > 0) {
      const interval = setInterval(() => {
        this.synchronizeDirectory(directoryName)
          .then((result) => {
            this.logger.log(
              `Scheduled sync for ${directoryName} completed: ${result.users} users, ${result.groups} groups updated`,
            );
          })
          .catch((error) => {
            this.logger.error(
              `Scheduled sync for ${directoryName} failed: ${error.message}`,
            );
          });
      }, intervalMs);

      this.syncIntervals.set(directoryName, interval);
      this.logger.log(
        `Scheduled automatic sync for ${directoryName} every ${intervalMs}ms`,
      );
    }
  }

  /**
   * Parse schedule string to milliseconds
   */
  private parseScheduleToMs(schedule: string): number {
    // Simple implementation - accepts strings like '1h', '30m', '24h'
    const match = schedule.match(/^(\d+)([hm])$/);

    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];

      if (unit === 'h') {
        return value * 60 * 60 * 1000;
      } else if (unit === 'm') {
        return value * 60 * 1000;
      }
    }

    this.logger.warn(`Invalid schedule format: ${schedule}, defaulting to 24h`);
    return 24 * 60 * 60 * 1000; // Default to 24 hours
  }

  /**
   * Authenticate user against directory
   */
  async authenticate(
    directoryName: string,
    username: string,
    password: string,
  ): Promise<{
    success: boolean;
    user?: User;
    isNewUser?: boolean;
    error?: string;
  }> {
    try {
      const config = this.directoryConfigs.get(directoryName);

      if (!config) {
        throw new Error(`Directory ${directoryName} not found`);
      }

      const client =
        this.clients.get(directoryName) || this.createClient(directoryName);

      // Find user DN first
      const { entry } = await this.findUser(directoryName, username);

      if (!entry) {
        return { success: false, error: 'User not found in directory' };
      }

      const userDN = entry.dn.toString();

      // Try to bind with user credentials
      const bindResult = await new Promise<boolean>((resolve, reject) => {
        const authClient = ldap.createClient({
          url: config.url,
          timeout: config.connectionTimeout || 5000,
          connectTimeout: config.connectionTimeout || 5000,
        });

        authClient.bind(userDN, password, (err) => {
          if (err) {
            this.logger.warn(
              `LDAP authentication failed for ${username}: ${err.message}`,
            );
            resolve(false);
          } else {
            resolve(true);
          }

          // Always close the connection
          authClient.unbind();
        });
      });

      if (!bindResult) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Authentication successful, find or provision user
      const { user, isNewUser } = await this.findOrProvisionUser(
        directoryName,
        entry,
      );

      return { success: true, user, isNewUser };
    } catch (error) {
      this.logger.error(`LDAP authentication error: ${error.message}`);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Find a user in the directory
   */
  private async findUser(
    directoryName: string,
    username: string,
  ): Promise<{
    entry?: any;
    attributes?: any;
  }> {
    const config = this.directoryConfigs.get(directoryName);

    if (!config) {
      throw new Error(`Directory ${directoryName} not found`);
    }

    const client =
      this.clients.get(directoryName) || this.createClient(directoryName);

    // Bind with service account
    await new Promise<void>((resolve, reject) => {
      client.bind(config.bindDN, config.bindCredentials, (err) => {
        if (err) {
          reject(new Error(`Service account bind failed: ${err.message}`));
        } else {
          resolve();
        }
      });
    });

    // Search for user
    const searchFilter = config.searchFilter.replace('{username}', username);

    const result = await new Promise<any>((resolve, reject) => {
      client.search(
        config.searchBase,
        {
          filter: searchFilter,
          scope: 'sub',
          attributes: Object.values(config.attributes),
        },
        (err, res) => {
          if (err) {
            reject(new Error(`User search failed: ${err.message}`));
            return;
          }

          let entry;
          let attributes = {};

          res.on('searchEntry', (e) => {
            entry = e;

            // Map LDAP attributes to our format
            for (const [key, attrName] of Object.entries(config.attributes)) {
              if (e.object[attrName]) {
                attributes[key] = e.object[attrName];
              }
            }
          });

          res.on('error', (e) => {
            reject(new Error(`Search error: ${e.message}`));
          });

          res.on('end', (result) => {
            if (!entry) {
              resolve({ entry: null, attributes: null });
            } else {
              resolve({ entry, attributes });
            }
          });
        },
      );
    });

    return result;
  }

  /**
   * Find user groups in the directory
   */
  private async getUserGroups(
    directoryName: string,
    userDN: string,
  ): Promise<string[]> {
    const config = this.directoryConfigs.get(directoryName);

    if (!config || !config.groupSearchBase) {
      return [];
    }

    const client =
      this.clients.get(directoryName) || this.createClient(directoryName);

    // Bind with service account if needed
    // (Already bound in most cases from previous operations)

    // Search for groups the user belongs to
    const groupFilter = config.groupSearchFilter.replace(
      '{userDN}',
      ldap.parseString(userDN).toString(),
    );

    const groups = await new Promise<string[]>((resolve, reject) => {
      client.search(
        config.groupSearchBase,
        {
          filter: groupFilter,
          scope: 'sub',
          attributes: ['cn'],
        },
        (err, res) => {
          if (err) {
            reject(new Error(`Group search failed: ${err.message}`));
            return;
          }

          const groups = [];

          res.on('searchEntry', (entry) => {
            if (entry.object.cn) {
              groups.push(entry.object.cn);
            }
          });

          res.on('error', (e) => {
            reject(new Error(`Group search error: ${e.message}`));
          });

          res.on('end', (result) => {
            resolve(groups);
          });
        },
      );
    });

    return groups;
  }

  /**
   * Find or provision a user based on directory information
   */
  private async findOrProvisionUser(
    directoryName: string,
    entry: any,
  ): Promise<{ user: User; isNewUser: boolean }> {
    const config = this.directoryConfigs.get(directoryName);
    const attributes = {};

    // Extract attributes from entry
    for (const [key, attrName] of Object.entries(config.attributes)) {
      if (entry.object[attrName]) {
        attributes[key] = entry.object[attrName];
      }
    }

    // Look for existing user with directory identity
    const directoryUserId = `${directoryName}:${attributes['username']}`;
    let user = await this.usersService.findByExternalId(directoryUserId);
    let isNewUser = false;

    if (!user) {
      // Try finding by email
      if (attributes['email']) {
        user = await this.usersService.findByEmail(attributes['email']);
      }

      if (!user) {
        // Need to provision new user
        isNewUser = true;

        // Create user with data from directory
        user = await this.usersService.create({
          email: attributes['email'],
          firstName: attributes['firstName'],
          lastName: attributes['lastName'],
          displayName:
            attributes['displayName'] ||
            `${attributes['firstName']} ${attributes['lastName']}`,
          externalId: directoryUserId,
          externalSource: 'ldap',
          emailVerified: true, // Trust directory email verification
        });

        this.logger.log(
          `Provisioned new user from directory ${directoryName}: ${user.id}`,
        );
      } else {
        // User exists by email, link to directory identity
        await this.usersService.update(user.id, {
          externalId: directoryUserId,
          externalSource: 'ldap',
        });

        this.logger.log(
          `Linked existing user to directory ${directoryName}: ${user.id}`,
        );
      }
    }

    // Get user groups and apply mappings
    try {
      const groups = await this.getUserGroups(
        directoryName,
        entry.dn.toString(),
      );

      if (groups && groups.length > 0) {
        await this.applyGroupMappings(user, groups, config.groupMappings);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to get groups for user ${user.id}: ${error.message}`,
      );
    }

    // Update user information from directory
    await this.updateUserFromDirectory(user.id, attributes);

    return { user, isNewUser };
  }

  /**
   * Update user information from directory attributes
   */
  private async updateUserFromDirectory(
    userId: string,
    attributes: any,
  ): Promise<User> {
    // Update user fields if they come from directory
    const updateData = {};

    if (attributes['email']) updateData['email'] = attributes['email'];
    if (attributes['firstName'])
      updateData['firstName'] = attributes['firstName'];
    if (attributes['lastName']) updateData['lastName'] = attributes['lastName'];
    if (attributes['displayName'])
      updateData['displayName'] = attributes['displayName'];

    // Only update if we have attributes to update
    if (Object.keys(updateData).length > 0) {
      return this.usersService.update(userId, updateData);
    }

    // Return original user
    return this.usersService.findById(userId);
  }

  /**
   * Apply group mappings from directory to roles
   */
  private async applyGroupMappings(
    user: User,
    groups: string[],
    mappings: Record<string, string>,
  ): Promise<void> {
    if (!groups || groups.length === 0 || !mappings) {
      return;
    }

    const rolesToAdd = [];

    // Match directory groups to role mappings
    for (const group of groups) {
      if (mappings[group]) {
        rolesToAdd.push(mappings[group]);
      }
    }

    if (rolesToAdd.length > 0) {
      // Add mapped roles to user
      await this.usersService.assignRoles(user.id, rolesToAdd);
    }
  }

  /**
   * Synchronize users and groups from directory
   */
  async synchronizeDirectory(
    directoryName: string,
  ): Promise<{ users: number; groups: number }> {
    const config = this.directoryConfigs.get(directoryName);

    if (!config) {
      throw new Error(`Directory ${directoryName} not found`);
    }

    this.logger.log(`Starting directory synchronization for ${directoryName}`);

    const client =
      this.clients.get(directoryName) || this.createClient(directoryName);

    // Bind with service account
    await new Promise<void>((resolve, reject) => {
      client.bind(config.bindDN, config.bindCredentials, (err) => {
        if (err) {
          reject(new Error(`Service account bind failed: ${err.message}`));
        } else {
          resolve();
        }
      });
    });

    // Search for all users
    const usersProcessed = await this.syncUsers(directoryName, client);

    // If group sync is configured, sync groups as well
    let groupsProcessed = 0;
    if (config.groupSearchBase && config.groupSearchFilter) {
      groupsProcessed = await this.syncGroups(directoryName, client);
    }

    this.logger.log(
      `Directory synchronization completed for ${directoryName}: ${usersProcessed} users, ${groupsProcessed} groups`,
    );

    return { users: usersProcessed, groups: groupsProcessed };
  }

  /**
   * Sync all users from directory
   */
  private async syncUsers(directoryName: string, client: any): Promise<number> {
    const config = this.directoryConfigs.get(directoryName);
    let processedCount = 0;

    // Search for all users
    const searchFilter = config.searchFilter.replace('{username}', '*');

    return new Promise<number>((resolve, reject) => {
      client.search(
        config.searchBase,
        {
          filter: searchFilter,
          scope: 'sub',
          attributes: Object.values(config.attributes),
        },
        (err, res) => {
          if (err) {
            reject(new Error(`User search failed: ${err.message}`));
            return;
          }

          const userPromises = [];

          res.on('searchEntry', (entry) => {
            // Process each user entry
            userPromises.push(this.processUserEntry(directoryName, entry));
            processedCount++;
          });

          res.on('error', (e) => {
            reject(new Error(`Search error: ${e.message}`));
          });

          res.on('end', async (result) => {
            // Wait for all user processing to complete
            try {
              await Promise.all(userPromises);
              resolve(processedCount);
            } catch (error) {
              reject(error);
            }
          });
        },
      );
    });
  }

  /**
   * Process a single user entry from directory
   */
  private async processUserEntry(
    directoryName: string,
    entry: any,
  ): Promise<void> {
    const config = this.directoryConfigs.get(directoryName);
    const attributes = {};

    // Extract attributes from entry
    for (const [key, attrName] of Object.entries(config.attributes)) {
      if (entry.object[attrName]) {
        attributes[key] = entry.object[attrName];
      }
    }

    if (!attributes['username']) {
      this.logger.warn(`User entry missing username attribute, skipping`);
      return;
    }

    try {
      const directoryUserId = `${directoryName}:${attributes['username']}`;
      let user = await this.usersService.findByExternalId(directoryUserId);
      let isNewUser = false;

      if (!user && attributes['email']) {
        // Try to find by email
        user = await this.usersService.findByEmail(attributes['email']);
      }

      if (!user) {
        // Create new user
        isNewUser = true;
        user = await this.usersService.create({
          email: attributes['email'],
          firstName: attributes['firstName'],
          lastName: attributes['lastName'],
          displayName:
            attributes['displayName'] ||
            `${attributes['firstName']} ${attributes['lastName']}`,
          externalId: directoryUserId,
          externalSource: 'ldap',
          emailVerified: true,
        });
      } else if (!user.externalId || user.externalId !== directoryUserId) {
        // Link existing user
        await this.usersService.update(user.id, {
          externalId: directoryUserId,
          externalSource: 'ldap',
        });
      }

      // Update user information
      await this.updateUserFromDirectory(user.id, attributes);

      // Get and apply group memberships
      const groups = await this.getUserGroups(
        directoryName,
        entry.dn.toString(),
      );
      if (groups && groups.length > 0) {
        await this.applyGroupMappings(user, groups, config.groupMappings);
      }

      // Emit event for new users
      if (isNewUser) {
        await this.eventsService.emitUserRegistered(user, {
          source: `directory:${directoryName}`,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error processing user ${attributes['username']}: ${error.message}`,
      );
    }
  }

  /**
   * Sync groups from directory
   */
  private async syncGroups(
    directoryName: string,
    client: any,
  ): Promise<number> {
    const config = this.directoryConfigs.get(directoryName);
    let processedCount = 0;

    if (!config.groupSearchBase) {
      return 0;
    }

    // Basic implementation - in a real system we might create group entities
    const groupFilter = '(objectClass=group)';

    return new Promise<number>((resolve, reject) => {
      client.search(
        config.groupSearchBase,
        {
          filter: groupFilter,
          scope: 'sub',
          attributes: ['cn', 'member'],
        },
        (err, res) => {
          if (err) {
            reject(new Error(`Group search failed: ${err.message}`));
            return;
          }

          const groupPromises = [];

          res.on('searchEntry', (entry) => {
            // Process each group entry
            groupPromises.push(this.processGroupEntry(directoryName, entry));
            processedCount++;
          });

          res.on('error', (e) => {
            reject(new Error(`Group search error: ${e.message}`));
          });

          res.on('end', async (result) => {
            // Wait for all group processing to complete
            try {
              await Promise.all(groupPromises);
              resolve(processedCount);
            } catch (error) {
              reject(error);
            }
          });
        },
      );
    });
  }

  /**
   * Process a group entry from directory
   */
  private async processGroupEntry(
    directoryName: string,
    entry: any,
  ): Promise<void> {
    // This is a placeholder for full group processing
    // In a real implementation, we would match members to users and update role assignments
    const config = this.directoryConfigs.get(directoryName);

    if (!entry.object.cn || !config.groupMappings[entry.object.cn]) {
      return;
    }

    this.logger.debug(
      `Processed group ${entry.object.cn} from directory ${directoryName}`,
    );
  }

  /**
   * Get all configured directories
   */
  getDirectories(): string[] {
    return Array.from(this.directoryConfigs.keys());
  }

  /**
   * Check directory connection status
   */
  async checkDirectoryConnection(directoryName: string): Promise<boolean> {
    const config = this.directoryConfigs.get(directoryName);

    if (!config) {
      throw new Error(`Directory ${directoryName} not found`);
    }

    const client =
      this.clients.get(directoryName) || this.createClient(directoryName);

    try {
      // Try binding with service account
      await new Promise<void>((resolve, reject) => {
        client.bind(config.bindDN, config.bindCredentials, (err) => {
          if (err) {
            reject(new Error(`Service account bind failed: ${err.message}`));
          } else {
            resolve();
          }
        });
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Connection check failed for ${directoryName}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Clean up resources on application shutdown
   */
  onApplicationShutdown() {
    // Clear sync intervals
    for (const [name, interval] of this.syncIntervals.entries()) {
      clearInterval(interval);
    }

    // Close LDAP clients
    for (const [name, client] of this.clients.entries()) {
      try {
        client.unbind();
      } catch (e) {
        this.logger.warn(`Error closing LDAP client for ${name}: ${e.message}`);
      }
    }
  }
}
