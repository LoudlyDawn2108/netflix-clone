import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionManagementService } from '../services/session-management.service';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserSession } from '../entities/user-session.entity';

@Controller('auth/sessions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SessionManagementController {
  private readonly logger = new Logger(SessionManagementController.name);

  constructor(
    private readonly sessionService: SessionManagementService,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
  ) {}

  /**
   * Get all active sessions for the current user
   */
  @Get('my')
  async getUserSessions(@GetUser() user: User): Promise<UserSession[]> {
    try {
      return await this.sessionService.getActiveSessions(user.id);
    } catch (error) {
      this.logger.error(
        `Failed to get user sessions: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to get sessions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Terminate a specific session (must belong to current user or admin)
   */
  @Delete(':sessionId')
  async terminateSession(
    @Param('sessionId') sessionId: string,
    @GetUser() user: User,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if the session belongs to the current user or user is admin
      const { valid, session } =
        await this.sessionService.validateSession(sessionId);

      if (!valid) {
        return {
          success: false,
          message: 'Session not found or already terminated',
        };
      }

      // Only allow users to terminate their own sessions, or admins to terminate any
      const isAdmin = user.roles?.includes('admin');

      if (session.userId !== user.id && !isAdmin) {
        throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
      }

      // Terminate the session
      await this.sessionService.terminateSession(sessionId, 'user-requested');

      return {
        success: true,
        message: 'Session terminated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to terminate session: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        `Failed to terminate session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Terminate all other sessions for the current user
   */
  @Delete('my/other')
  async terminateOtherSessions(
    @GetUser() user: User,
    @Body() body: { currentSessionId: string },
    @Req() req: Request,
  ): Promise<{ success: boolean; count: number }> {
    try {
      if (!body.currentSessionId) {
        throw new HttpException(
          'Current session ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate the current session
      const { valid } = await this.sessionService.validateSession(
        body.currentSessionId,
        user.id,
      );

      if (!valid) {
        throw new HttpException(
          'Invalid current session',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Terminate all other sessions
      const count = await this.sessionService.terminateAllUserSessions(
        user.id,
        body.currentSessionId,
        'user-terminated-other',
      );

      return {
        success: true,
        count,
      };
    } catch (error) {
      this.logger.error(
        `Failed to terminate other sessions: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        `Failed to terminate other sessions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Terminate all sessions for a user (admin only)
   */
  @Delete('user/:userId')
  @Roles('admin')
  async terminateUserSessions(
    @Param('userId') userId: string,
    @GetUser() admin: User,
  ): Promise<{ success: boolean; count: number }> {
    try {
      const count = await this.sessionService.terminateAllUserSessions(
        userId,
        undefined,
        'admin-terminated',
      );

      return {
        success: true,
        count,
      };
    } catch (error) {
      this.logger.error(
        `Failed to terminate user sessions: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        `Failed to terminate user sessions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all sessions for a user (admin only)
   */
  @Get('user/:userId')
  @Roles('admin')
  async getUserSessionsByAdmin(
    @Param('userId') userId: string,
  ): Promise<UserSession[]> {
    try {
      return await this.sessionService.getActiveSessions(userId);
    } catch (error) {
      this.logger.error(
        `Failed to get user sessions: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to get sessions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extend current session
   */
  @Post('extend')
  async extendSession(
    @Body() body: { sessionId: string },
    @GetUser() user: User,
  ): Promise<{ success: boolean; expiresAt?: Date }> {
    try {
      if (!body.sessionId) {
        throw new HttpException(
          'Session ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate that the session belongs to the user
      const { valid, session } = await this.sessionService.validateSession(
        body.sessionId,
        user.id,
      );

      if (!valid || !session) {
        throw new HttpException('Invalid session', HttpStatus.BAD_REQUEST);
      }

      // Extend the session
      const extended = await this.sessionService.extendSession(body.sessionId);

      if (!extended) {
        throw new HttpException(
          'Failed to extend session',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get updated session details
      const updatedSession = await this.sessionRepository.findOne({
        where: { id: body.sessionId },
      });

      return {
        success: true,
        expiresAt: updatedSession.expiresAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to extend session: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        `Failed to extend session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get current session policy
   */
  @Get('my/policy')
  async getSessionPolicy(@GetUser() user: User): Promise<{
    maxConcurrentSessions: number;
    sessionDuration: number;
    inactivityTimeout: number;
    requireMfaForExtension: boolean;
    absoluteSessionTimeout: number;
  }> {
    try {
      const policy = await this.sessionService.getUserSessionPolicy(user.id);

      // Return only the policy values that are safe to expose to clients
      return {
        maxConcurrentSessions: policy.maxConcurrentSessions,
        sessionDuration: policy.sessionDuration,
        inactivityTimeout: policy.inactivityTimeout,
        requireMfaForExtension: policy.requireMfaForExtension,
        absoluteSessionTimeout: policy.absoluteSessionTimeout,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get session policy: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to get session policy',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
