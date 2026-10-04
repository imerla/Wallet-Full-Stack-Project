import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { AdminService } from './admin.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/enums';

import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==========================================
  // ADMIN USER MANAGEMENT
  // ==========================================

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getUsers(@Query('search') search?: string) {
    return this.adminService.getUsers(search);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  // ==========================================
  // ADMIN AVAILABILITY
  // ==========================================

  @Patch('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateAvailability(
    @Request()
    req: {
      user: {
        userId: string;
      };
    },
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    return this.adminService.updateAvailability(
      req.user.userId,
      updateAvailabilityDto.isOnline,
    );
  }

  @Get('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAvailability(
    @Request()
    req: {
      user: {
        userId: string;
      };
    },
  ) {
    return this.adminService.getAvailability(req.user.userId);
  }

  // ==========================================
  // AVAILABLE REPRESENTATIVES
  // ==========================================

  @Get('available-representatives')
  @UseGuards(JwtAuthGuard)
  async getAvailableRepresentatives() {
    return this.adminService.getAvailableRepresentatives();
  }
}
