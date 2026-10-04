import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { RolesGuard } from '../auth/guards/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';

import { UserRole } from '../common/enums/enums';

import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /*
   * ==========================================================
   * FUZZY USER SEARCH
   * ==========================================================
   *
   * Example:
   *
   * GET /users/search?query=gior
   *
   * Requires JWT authentication.
   */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchUsers(@Request() req, @Query('query') query: string) {
    return this.usersService.searchUsers(req.user.userId, query || '');
  }

  /*
   * ==========================================================
   * ADMIN TEST
   * ==========================================================
   */

  @Get('admin/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminTest(@Request() req) {
    return {
      message: 'Admin access granted',

      role: req.user.role,
    };
  }

  /*
   * ==========================================================
   * USER TEST
   * ==========================================================
   */

  @Get('user/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  userTest(@Request() req) {
    return {
      message: 'User access granted',

      role: req.user.role,
    };
  }
}
