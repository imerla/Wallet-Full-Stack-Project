import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import Decimal from 'decimal.js';

import {
  MoneyRequest,
  MoneyRequestDocument,
} from './schema/money-request.schema';

import { User, UserDocument } from '../users/schema/user.schema';

import { Wallet, WalletDocument } from '../wallet/schema/wallet.schema';

import {
  Transaction,
  TransactionDocument,
} from '../payments/schema/transaction.schema';

import {
  MoneyRequestStatus,
  TransactionFlowType,
  TransactionStatus,
  TransactionType,
} from '../common/enums/enums';

import { CreateMoneyRequestDto } from './dto/create-money-request.dto';

import { RespondMoneyRequestDto } from './dto/respond-money-request.dto';

import { EmailService } from '../email/email.service';

import { NotificationsService } from '../notifications/notifications.service';

import { NotificationType } from '../notifications/schema/notification.schema';

@Injectable()
export class MoneyRequestsService {
  private readonly logger = new Logger(MoneyRequestsService.name);

  constructor(
    @InjectModel(MoneyRequest.name)
    private moneyRequestModel: Model<MoneyRequestDocument>,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    @InjectModel(Wallet.name)
    private walletModel: Model<WalletDocument>,

    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,

    private readonly emailService: EmailService,

    private readonly notificationsService: NotificationsService,
  ) {}

  async createRequest(requesterId: string, dto: CreateMoneyRequestDto) {
    const requester = await this.userModel.findById(requesterId);

    if (!requester) {
      throw new NotFoundException('Requester not found');
    }

    const requestedFrom = await this.userModel.findOne({
      email: dto.requested_from_email.toLowerCase().trim(),
    });

    if (!requestedFrom) {
      throw new NotFoundException('The requested user does not exist');
    }

    if (requester._id.toString() === requestedFrom._id.toString()) {
      throw new BadRequestException('You cannot request money from yourself');
    }

    const existingRequest = await this.moneyRequestModel.findOne({
      requesterId: requester._id,

      requestedFromId: requestedFrom._id,

      status: MoneyRequestStatus.PENDING,
    });

    if (existingRequest) {
      throw new BadRequestException(
        'A pending request already exists for this user',
      );
    }

    const request = new this.moneyRequestModel({
      requesterId: requester._id,

      requestedFromId: requestedFrom._id,

      amount: dto.amount.toString(),

      description: dto.description || 'Money request',

      status: MoneyRequestStatus.PENDING,
    });

    const savedRequest = await request.save();

    try {
      await this.notificationsService.create(
        requestedFrom._id,
        NotificationType.MONEY_REQUEST_RECEIVED,
        'Money Request',
        `${requester.username} requested $${dto.amount} from you.`,
        savedRequest._id,
      );
    } catch (notificationError) {
      this.logger.warn(
        'Money request in-app notification failed.',
        notificationError,
      );
    }

    try {
      await this.sendRequestEmail(
        requestedFrom.email,
        requestedFrom.username,
        requester.username,
        dto.amount.toString(),
        dto.description || 'Money request',
      );
    } catch (error) {
      this.logger.error('Failed to send money request email', error);
    }

    return this.formatRequest(savedRequest);
  }

  async getIncomingRequests(userId: string) {
    const requests = await this.moneyRequestModel
      .find({
        requestedFromId: new Types.ObjectId(userId),
      })
      .populate('requesterId', 'username email')
      .sort({
        createdAt: -1,
      });

    return requests.map((request) => this.formatRequest(request));
  }

  async getOutgoingRequests(userId: string) {
    const requests = await this.moneyRequestModel
      .find({
        requesterId: new Types.ObjectId(userId),
      })
      .populate('requestedFromId', 'username email')
      .sort({
        createdAt: -1,
      });

    return requests.map((request) => this.formatRequest(request));
  }

  async respondToRequest(
    userId: string,
    requestId: string,
    dto: RespondMoneyRequestDto,
  ) {
    const session = await this.moneyRequestModel.db.startSession();

    session.startTransaction();

    try {
      const request = await this.moneyRequestModel
        .findById(requestId)
        .session(session);

      if (!request) {
        throw new NotFoundException('Money request not found');
      }

      if (request.requestedFromId.toString() !== userId) {
        throw new ForbiddenException('You cannot respond to this request');
      }

      if (request.status !== MoneyRequestStatus.PENDING) {
        throw new BadRequestException(
          'This request has already been processed',
        );
      }

      if (dto.action === 'REJECT') {
        request.status = MoneyRequestStatus.REJECTED;

        request.respondedAt = new Date();

        await request.save({
          session,
        });

        await session.commitTransaction();

        try {
          await this.notificationsService.create(
            request.requesterId,
            NotificationType.MONEY_REQUEST_REJECTED,
            'Money Request Rejected',
            `Your request for $${request.amount.toString()} was rejected.`,
            request._id,
          );
        } catch (notificationError) {
          this.logger.warn(
            'Money request rejection notification failed.',
            notificationError,
          );
        }

        return {
          message: 'Money request rejected',

          requestId: request._id,

          status: request.status,
        };
      }

      const payerWallet = await this.walletModel
        .findOne({
          userId: request.requestedFromId,
        })
        .session(session);

      if (!payerWallet) {
        throw new NotFoundException('Your wallet was not found');
      }

      const requesterWallet = await this.walletModel
        .findOne({
          userId: request.requesterId,
        })
        .session(session);

      if (!requesterWallet) {
        throw new NotFoundException('Requester wallet was not found');
      }

      const payerBalance = new Decimal(payerWallet.balance.toString());

      const amount = new Decimal(request.amount.toString());

      if (payerBalance.comparedTo(amount) < 0) {
        throw new BadRequestException('Insufficient balance');
      }

      const newPayerBalance = payerBalance.minus(amount);

      payerWallet.balance = newPayerBalance.toString() as any;

      await payerWallet.save({
        session,
      });

      const requesterBalance = new Decimal(requesterWallet.balance.toString());

      const newRequesterBalance = requesterBalance.plus(amount);

      requesterWallet.balance = newRequesterBalance.toString() as any;

      await requesterWallet.save({
        session,
      });

      const payerTransactionId = this.generateTransactionId();

      const requesterTransactionId = this.generateTransactionId();

      const payerTransaction = new this.transactionModel({
        transactionId: payerTransactionId,

        userId: request.requestedFromId,

        sender: request.requestedFromId,

        receiver: request.requesterId,

        amount: amount.toString(),

        type: TransactionFlowType.EXPENSE,

        transactionType: TransactionType.TRANSFER,

        status: TransactionStatus.COMPLETED,

        description: request.description || 'Money request payment',

        relatedTransactionId: requesterTransactionId,
      });

      await payerTransaction.save({
        session,
      });

      const requesterTransaction = new this.transactionModel({
        transactionId: requesterTransactionId,

        userId: request.requesterId,

        sender: request.requestedFromId,

        receiver: request.requesterId,

        amount: amount.toString(),

        type: TransactionFlowType.INCOME,

        transactionType: TransactionType.TRANSFER,

        status: TransactionStatus.COMPLETED,

        description: request.description || 'Money request payment',

        relatedTransactionId: payerTransactionId,
      });

      await requesterTransaction.save({
        session,
      });

      request.status = MoneyRequestStatus.ACCEPTED;

      request.respondedAt = new Date();

      await request.save({
        session,
      });

      await session.commitTransaction();

      try {
        const [payer, requester] = await Promise.all([
          this.userModel.findById(request.requestedFromId),

          this.userModel.findById(request.requesterId),
        ]);

        try {
          await Promise.all([
            this.notificationsService.create(
              request.requesterId,
              NotificationType.MONEY_REQUEST_ACCEPTED,
              'Money Request Accepted',
              `Your request for $${amount.toString()} was accepted.`,
              request._id,
            ),

            this.notificationsService.create(
              request.requestedFromId,
              NotificationType.MONEY_SENT,
              'Money Sent',
              `You paid $${amount.toString()} to ${requester?.username || 'the recipient'}.`,
              request._id,
            ),

            this.notificationsService.create(
              request.requesterId,
              NotificationType.MONEY_RECEIVED,
              'Money Received',
              `You received $${amount.toString()} from ${payer?.username || 'the payer'}.`,
              request._id,
            ),
          ]);
        } catch (notificationError) {
          this.logger.warn(
            'Money request acceptance notifications failed after successful payment.',
            notificationError,
          );
        }

        if (payer && requester) {
          await this.sendAcceptedEmail(
            requester.email,
            requester.username,
            payer.username,
            amount.toString(),
            requesterTransactionId,
          );

          await this.sendAcceptedEmail(
            payer.email,
            payer.username,
            requester.username,
            amount.toString(),
            payerTransactionId,
          );
        }
      } catch (emailError) {
        this.logger.error(
          'Money request email notification failed',
          emailError,
        );
      }

      return {
        message: 'Money request accepted successfully',

        requestId: request._id,

        status: request.status,

        amount: amount.toString(),

        transactionId: requesterTransactionId,

        newBalance: newRequesterBalance.toString(),
      };
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      await session.endSession();
    }
  }

  // ============================================================
  // CANCEL OUTGOING REQUEST
  // ============================================================

  async cancelRequest(userId: string, requestId: string) {
    const request = await this.moneyRequestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Money request not found');
    }

    if (request.requesterId.toString() !== userId) {
      throw new ForbiddenException('You cannot cancel this request');
    }

    if (request.status !== MoneyRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    request.status = MoneyRequestStatus.CANCELLED;

    request.cancelledAt = new Date();

    await request.save();

    try {
      await this.notificationsService.create(
        request.requestedFromId,
        NotificationType.MONEY_REQUEST_CANCELLED,
        'Money Request Cancelled',
        'A money request sent to you was cancelled.',
        request._id,
      );
    } catch (notificationError) {
      this.logger.warn(
        'Money request cancellation notification failed.',
        notificationError,
      );
    }

    return {
      message: 'Money request cancelled',

      requestId: request._id,

      status: request.status,
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private generateTransactionId(): string {
    return `TXN${Date.now()}${Math.random()
      .toString(36)
      .substring(2, 11)
      .toUpperCase()}`;
  }

  private formatRequest(request: MoneyRequestDocument) {
    const raw = request.toObject();

    return {
      id: raw._id,

      requesterId: raw.requesterId,

      requestedFromId: raw.requestedFromId,

      amount: raw.amount.toString(),

      description: raw.description,

      status: raw.status,

      respondedAt: raw.respondedAt,

      cancelledAt: raw.cancelledAt,

      createdAt: raw.createdAt,

      updatedAt: raw.updatedAt,
    };
  }

  private async sendRequestEmail(
    toEmail: string,
    recipientUsername: string,
    requesterUsername: string,
    amount: string,
    description: string,
  ) {
    /*
     * We use the existing EmailService.
     *
     * If your EmailService currently does not
     * have this method, we will add it in the
     * next code block below.
     */
    const service = this.emailService as any;

    if (typeof service.sendMoneyRequestEmail === 'function') {
      await service.sendMoneyRequestEmail({
        toEmail,
        recipientUsername,
        requesterUsername,
        amount,
        description,
      });
    }
  }

  private async sendAcceptedEmail(
    toEmail: string,
    recipientUsername: string,
    counterpartyUsername: string,
    amount: string,
    transactionId: string,
  ) {
    const service = this.emailService as any;

    if (typeof service.sendMoneyRequestAcceptedEmail === 'function') {
      await service.sendMoneyRequestAcceptedEmail({
        toEmail,
        recipientUsername,
        counterpartyUsername,
        amount,
        transactionId,
      });
    }
  }
}
