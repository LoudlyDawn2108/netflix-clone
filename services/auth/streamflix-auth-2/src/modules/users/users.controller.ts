import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService, PaginationParams } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('orderBy') orderBy?: string,
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('search') search?: string,
  ) {
    const params: PaginationParams = {
      page,
      limit,
      orderBy,
      order,
      search,
    };

    return this.usersService.findAllPaginated(params);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  @Post('verify-email/:token')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Param('token') token: string,
  ): Promise<{ message: string }> {
    await this.usersService.verifyEmail(token);
    return { message: 'Email verified successfully' };
  }

  @Put(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
  ): Promise<User> {
    return this.usersService.update(id, { role });
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ): Promise<User> {
    return this.usersService.update(id, { isActive });
  }

  @Put(':id/mfa')
  @UseGuards(JwtAuthGuard)
  async updateMfaStatus(
    @Param('id') id: string,
    @Body('mfaEnabled') mfaEnabled: boolean,
    @Body('mfaSecret') mfaSecret?: string,
  ): Promise<User> {
    return this.usersService.update(id, { mfaEnabled, mfaSecret });
  }

  @Post(':id/clear-lockout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async clearLockout(@Param('id') id: string): Promise<User> {
    return this.usersService.clearLockout(id);
  }
}
