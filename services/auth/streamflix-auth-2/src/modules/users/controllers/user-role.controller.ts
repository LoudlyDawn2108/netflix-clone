import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { HasPermission } from '../../../common/decorators/permission.decorator';
import { UsersService } from '../users.service';
import { AssignRolesToUserDto } from '../dto/role.dto';

@ApiTags('user-roles')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class UserRoleController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get roles for a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the roles assigned to the user',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get(':userId/roles')
  @HasPermission('view:users')
  async getUserRoles(@Param('userId') userId: string) {
    return this.usersService.getUserRoles(userId);
  }

  @ApiOperation({ summary: 'Assign roles to a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles assigned successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or role not found',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Post(':userId/roles')
  @HasPermission('manage:users')
  async assignRolesToUser(
    @Param('userId') userId: string,
    @Body() dto: AssignRolesToUserDto,
  ) {
    return this.usersService.assignRolesToUser(userId, dto.roleIds);
  }

  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Role removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or role not found',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @Delete(':userId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @HasPermission('manage:users')
  async removeRoleFromUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    await this.usersService.removeRoleFromUser(userId, roleId);
  }
}
