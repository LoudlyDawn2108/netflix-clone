import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { MultiRegionService } from '../services/multi-region.service';

// DTOs
class SessionSyncDto {
  userId: string;
  sessionId: string;
  action: 'login' | 'logout' | 'refresh';
}

class AccountActionDto {
  userId: string;
  reason?: string;
  action: 'lock' | 'unlock' | 'password_change';
}

@Controller('admin/multi-region')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'system-admin')
export class MultiRegionController {
  private readonly logger = new Logger(MultiRegionController.name);

  constructor(private readonly multiRegionService: MultiRegionService) {}

  /**
   * Get multi-region status
   */
  @Get('status')
  async getStatus() {
    return {
      region: this.multiRegionService.getRegionName(),
      isPrimary: this.multiRegionService.isPrimaryRegion(),
      regions: this.multiRegionService.getAllRegions(),
    };
  }

  /**
   * Manually trigger a session sync event
   */
  @Post('sync/session')
  async syncSession(@Body(ValidationPipe) syncDto: SessionSyncDto) {
    this.logger.log(
      `Manual session sync requested: ${syncDto.action} for user ${syncDto.userId}`,
    );

    switch (syncDto.action) {
      case 'login':
        await this.multiRegionService.notifyLogin(
          syncDto.userId,
          syncDto.sessionId,
        );
        break;

      case 'logout':
        await this.multiRegionService.notifyLogout(
          syncDto.userId,
          syncDto.sessionId,
        );
        break;

      case 'refresh':
        await this.multiRegionService.notifyTokenRefresh(
          syncDto.userId,
          syncDto.sessionId,
        );
        break;
    }

    return {
      success: true,
      action: syncDto.action,
      userId: syncDto.userId,
      sessionId: syncDto.sessionId,
    };
  }

  /**
   * Manually trigger an account action sync
   */
  @Post('sync/account')
  async syncAccountAction(@Body(ValidationPipe) actionDto: AccountActionDto) {
    this.logger.log(
      `Manual account action sync requested: ${actionDto.action} for user ${actionDto.userId}`,
    );

    switch (actionDto.action) {
      case 'lock':
        await this.multiRegionService.notifyAccountLocked(
          actionDto.userId,
          actionDto.reason || 'manual_admin_action',
        );
        break;

      case 'unlock':
        await this.multiRegionService.notifyAccountUnlocked(actionDto.userId);
        break;

      case 'password_change':
        await this.multiRegionService.notifyPasswordChange(actionDto.userId);
        break;
    }

    return {
      success: true,
      action: actionDto.action,
      userId: actionDto.userId,
    };
  }
}
