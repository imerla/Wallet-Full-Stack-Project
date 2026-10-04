import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  Get,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CheckoutDto } from './dto/checkout.dto';
import { WebhookDto } from './dto/webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/enums';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  checkout(@Request() req, @Body() checkoutDto: CheckoutDto) {
    return this.paymentsService.checkout(req.user.userId, checkoutDto);
  }

  @Post('webhook')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  webhook(@Body() webhookDto: WebhookDto) {
    return this.paymentsService.webhook(webhookDto);
  }

  @Post('transactions/:transactionId/cancel')
  @UseGuards(JwtAuthGuard)
  cancelTransaction(
    @Request() req,
    @Param('transactionId') transactionId: string,
  ) {
    return this.paymentsService.cancelTransfer(req.user.userId, transactionId);
  }

  @Get('pending-topups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getPendingTopUps() {
    return this.paymentsService.getPendingTopUps();
  }

  @Get('all-topups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllTopUps(@Request() req) {
    const { page, limit, status, search } = req.query;
    return this.paymentsService.getAllTopUps({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
      search,
    });
  }
}
