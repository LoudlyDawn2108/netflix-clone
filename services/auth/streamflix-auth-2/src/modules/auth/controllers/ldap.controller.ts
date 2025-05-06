import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
  Query,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { LdapService } from '../services/ldap.service';
import { AuthService } from '../services/auth.service';

// DTOs
class LdapLoginDto {
  directory: string;
  username: string;
  password: string;
}

class LdapSearchDto {
  directory: string;
  searchTerm: string;
  limit?: number;
}

@Controller('auth/ldap')
export class LdapController {
  private readonly logger = new Logger(LdapController.name);

  constructor(
    private readonly ldapService: LdapService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Get available LDAP directories
   */
  @Get('directories')
  @Roles('admin', 'identity-admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getDirectories() {
    const directories = this.ldapService.getAvailableDirectories();
    return { directories };
  }

  /**
   * Login with LDAP credentials
   */
  @Public()
  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LdapLoginDto) {
    try {
      const result = await this.ldapService.authenticateAndProvision(
        loginDto.directory,
        loginDto.username,
        loginDto.password,
      );

      if (!result) {
        throw new HttpException(
          'Invalid LDAP credentials',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const { user, isNewUser } = result;

      // Generate JWT token
      const tokens = await this.authService.generateTokens(user);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
        },
        isNewUser,
      };
    } catch (error) {
      this.logger.error(`LDAP login error: ${error.message}`, error.stack);
      throw new HttpException('Authentication failed', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * Search LDAP users
   */
  @Post('search')
  @Roles('admin', 'identity-admin', 'user-manager')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async searchUsers(@Body(ValidationPipe) searchDto: LdapSearchDto) {
    try {
      const users = await this.ldapService.searchUsers(
        searchDto.directory,
        searchDto.searchTerm,
        searchDto.limit || 20,
      );

      return {
        users: users.map((user) => ({
          uid: user.uid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          groups: user.groups,
        })),
        total: users.length,
      };
    } catch (error) {
      this.logger.error(`LDAP search error: ${error.message}`, error.stack);
      throw new HttpException(
        'LDAP search failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if a user exists in LDAP
   */
  @Get('users/:directory/:username')
  @Roles('admin', 'identity-admin', 'user-manager')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async checkUser(
    @Param('directory') directory: string,
    @Param('username') username: string,
  ) {
    try {
      const user = await this.ldapService.findUser(directory, username);

      if (!user) {
        return { exists: false };
      }

      return {
        exists: true,
        user: {
          uid: user.uid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
        },
      };
    } catch (error) {
      this.logger.error(`LDAP user check error: ${error.message}`, error.stack);
      throw new HttpException(
        'LDAP user check failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
