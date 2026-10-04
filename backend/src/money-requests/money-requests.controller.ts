import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';

import { MoneyRequestsService } from './money-requests.service';

import { CreateMoneyRequestDto } from './dto/create-money-request.dto';

import { RespondMoneyRequestDto } from './dto/respond-money-request.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('money-requests')
@UseGuards(JwtAuthGuard)
export class MoneyRequestsController {
  constructor(private readonly moneyRequestsService: MoneyRequestsService) {}

  /*
   * Request money from another user.
   */
  @Post()
  createRequest(
    @Request() req,
    @Body()
    dto: CreateMoneyRequestDto,
  ) {
    return this.moneyRequestsService.createRequest(req.user.userId, dto);
  }

  /*
   * Requests other users have sent to me.
   */
  @Get('incoming')
  getIncomingRequests(@Request() req) {
    return this.moneyRequestsService.getIncomingRequests(req.user.userId);
  }

  /*
   * Requests I have sent to other users.
   */
  @Get('outgoing')
  getOutgoingRequests(@Request() req) {
    return this.moneyRequestsService.getOutgoingRequests(req.user.userId);
  }

  /*
   * Accept or reject a request.
   */
  @Patch(':requestId/respond')
  respondToRequest(
    @Request() req,
    @Param('requestId')
    requestId: string,

    @Body()
    dto: RespondMoneyRequestDto,
  ) {
    return this.moneyRequestsService.respondToRequest(
      req.user.userId,
      requestId,
      dto,
    );
  }

  /*
   * Cancel a request I created.
   */
  @Delete(':requestId')
  cancelRequest(
    @Request() req,
    @Param('requestId')
    requestId: string,
  ) {
    return this.moneyRequestsService.cancelRequest(req.user.userId, requestId);
  }
}
