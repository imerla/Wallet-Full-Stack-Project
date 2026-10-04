import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Body,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransferDto } from './dto/transfer.dto';
import { PaymentsService } from '../payments/payments.service';
import { TransactionsQueryDto } from '../payments/dto/transactions-query.dto';

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getWallet(@Request() req) {
    return this.walletService.getWalletByUserId(req.user.userId);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  transfer(@Request() req, @Body() transferDto: TransferDto) {
    return this.walletService.transfer(req.user.userId, transferDto);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  getTransactions(@Request() req, @Query() query: TransactionsQueryDto) {
    return this.paymentsService.getTransactions(req.user.userId, query);
  }

  @Get('transactions/stats')
  @UseGuards(JwtAuthGuard)
  getTransactionStats(
    @Request() req,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.paymentsService.getTransactionStats(
      req.user.userId,
      fromDate,
      toDate,
    );
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  getAnalytics(@Request() req) {
    return this.paymentsService.getAnalytics(req.user.userId);
  }

  @Get('transactions/export')
  @UseGuards(JwtAuthGuard)
  async exportTransactions(@Request() req, @Res() res: Response) {
    const csv = await this.paymentsService.exportTransactions(req.user.userId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=transactions.csv',
    );
    res.send(csv);
  }
}
