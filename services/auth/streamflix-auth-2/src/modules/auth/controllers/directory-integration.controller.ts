import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { DirectoryIntegrationService } from '../services/directory-integration.service';
import { AuthService } from '../services/auth.service';
import { EventsService } from '../../events/events.service';

@Controller('auth/directory')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DirectoryIntegrationController {
  private readonly logger = new Logger(DirectoryIntegrationController.name);

  constructor(
    private readonly directoryService: DirectoryIntegrationService,
    private readonly authService: AuthService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Authenticate user against directory
   */
  @Post('authenticate/:directory')
  async authenticate(
    @Param('directory') directoryName: string,
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    try {
      const result = await this.directoryService.authenticate(
        directoryName,
        username,
        password,
      );

      if (!result.success) {
        throw new HttpException(
          result.error || 'Authentication failed',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Generate tokens for the user
      const { accessToken, refreshToken } =
        await this.authService.generateTokens(result.user);

      // Emit login event
      await this.eventsService.emitUserLoggedIn(result.user, {
        method: `directory:${directoryName}`,
        jit: result.isNewUser,
      });

      // If user was just provisioned, emit registration event
      if (result.isNewUser) {
        await this.eventsService.emitUserRegistered(result.user, {
          source: `directory:${directoryName}`,
        });
      }

      return {
        user: result.user,
        accessToken,
        refreshToken,
        isNewUser: result.isNewUser,
      };
    } catch (error) {
      this.logger.error(`Directory authentication error: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Directory authentication failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List available directories
   */
  @Get('list')
  @Roles('admin')
  async listDirectories() {
    try {
      const directories = this.directoryService.getDirectories();
      return { directories };
    } catch (error) {
      this.logger.error(`Error listing directories: ${error.message}`);
      throw new HttpException(
        'Failed to list directories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check directory connection status
   */
  @Get('check/:directory')
  @Roles('admin')
  async checkConnection(@Param('directory') directoryName: string) {
    try {
      const connected =
        await this.directoryService.checkDirectoryConnection(directoryName);
      return { directory: directoryName, connected };
    } catch (error) {
      this.logger.error(
        `Error checking directory connection: ${error.message}`,
      );
      throw new HttpException(
        'Failed to check directory connection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger manual synchronization
   */
  @Post('sync/:directory')
  @Roles('admin')
  async syncDirectory(@Param('directory') directoryName: string) {
    try {
      const result =
        await this.directoryService.synchronizeDirectory(directoryName);

      return {
        directory: directoryName,
        ...result,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Directory sync error: ${error.message}`);
      throw new HttpException(
        'Directory synchronization failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
