import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import Decimal from 'decimal.js';

import { Wallet, WalletDocument } from './schema/wallet.schema';

import { User, UserDocument } from '../users/schema/user.schema';

import {
  Transaction,
  TransactionDocument,
} from '../payments/schema/transaction.schema';

import { TransferDto } from './dto/transfer.dto';

import {
  TransactionType,
  TransactionStatus,
  TransactionFlowType,
} from '../common/enums/enums';

import { EmailService } from '../email/email.service';

import { NotificationsService } from '../notifications/notifications.service';

import { NotificationType } from '../notifications/schema/notification.schema';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Wallet.name)
    private walletModel: Model<WalletDocument>,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,

    private readonly emailService: EmailService,

    private readonly notificationsService: NotificationsService,
  ) {}

  async getWalletByUserId(userId: string) {
    const wallet = await this.walletModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: wallet._id,
      balance: wallet.balance,
      userId: user._id,
      username: user.username,
      email: user.email,
    };
  }

  async transfer(senderUserId: string, transferDto: TransferDto) {
    const {
      receiver_email,
      receiver_wallet_id,
      receiver_user_id,
      amount,
      description,
    } = transferDto;

    if (!receiver_email && !receiver_wallet_id && !receiver_user_id) {
      throw new BadRequestException(
        'At least one receiver identifier must be provided',
      );
    }

    const sender = await this.userModel.findById(senderUserId);

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    let receiver: UserDocument | null = null;

    if (receiver_email) {
      receiver = await this.userModel.findOne({
        email: receiver_email,
      });
    } else if (receiver_wallet_id) {
      const wallet = await this.walletModel.findById(receiver_wallet_id);

      if (!wallet) {
        throw new NotFoundException('Receiver wallet not found');
      }

      receiver = await this.userModel.findById(wallet.userId);
    } else if (receiver_user_id) {
      receiver = await this.userModel.findById(receiver_user_id);
    }

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    if (sender._id.toString() === receiver._id.toString()) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    const transferAmount = amount.toString();

    const session = await this.walletModel.db.startSession();

    session.startTransaction();

    try {
      const senderWallet = await this.walletModel
        .findOne({
          userId: sender._id,
        })
        .session(session);

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found');
      }

      const receiverWallet = await this.walletModel
        .findOne({
          userId: receiver._id,
        })
        .session(session);

      if (!receiverWallet) {
        throw new NotFoundException('Receiver wallet not found');
      }

      const senderBalance = new Decimal(senderWallet.balance.toString());

      const transferAmountDecimal = new Decimal(transferAmount);

      if (senderBalance.comparedTo(transferAmountDecimal) < 0) {
        throw new BadRequestException('Insufficient balance');
      }

      const newSenderBalance = senderBalance.minus(transferAmountDecimal);

      senderWallet.balance = newSenderBalance.toString() as any;

      await senderWallet.save({
        session,
      });

      const receiverBalance = new Decimal(receiverWallet.balance.toString());

      const newReceiverBalance = receiverBalance.plus(transferAmountDecimal);

      receiverWallet.balance = newReceiverBalance.toString() as any;

      await receiverWallet.save({
        session,
      });

      const senderTransactionId = this.generateTransactionId();

      const receiverTransactionId = this.generateTransactionId();

      const cancellableUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const senderTransaction = new this.transactionModel({
        transactionId: senderTransactionId,

        userId: sender._id,

        sender: sender._id,

        receiver: receiver._id,

        amount: transferAmount,

        type: TransactionFlowType.EXPENSE,

        transactionType: TransactionType.TRANSFER,

        status: TransactionStatus.COMPLETED,

        description: description || `Transfer to ${receiver.email}`,

        relatedTransactionId: receiverTransactionId,

        cancellableUntil,
      });

      const receiverTransaction = new this.transactionModel({
        transactionId: receiverTransactionId,

        userId: receiver._id,

        sender: sender._id,

        receiver: receiver._id,

        amount: transferAmount,

        type: TransactionFlowType.INCOME,

        transactionType: TransactionType.TRANSFER,

        status: TransactionStatus.COMPLETED,

        description: description || `Transfer from ${sender.email}`,

        relatedTransactionId: senderTransactionId,

        cancellableUntil: undefined,
      });

      await senderTransaction.save({
        session,
      });

      await receiverTransaction.save({
        session,
      });

      await session.commitTransaction();

      try {
        await Promise.all([
          this.notificationsService.create(
            sender._id,
            NotificationType.MONEY_SENT,
            'Money Sent',
            `You sent $${transferAmount} to ${receiver.username}.`,
            senderTransaction._id,
          ),

          this.notificationsService.create(
            receiver._id,
            NotificationType.MONEY_RECEIVED,
            'Money Received',
            `You received $${transferAmount} from ${sender.username}.`,
            receiverTransaction._id,
          ),
        ]);
      } catch (notificationError) {
        this.logger.warn(
          'In-app transfer notifications failed after successful transaction.',
          notificationError,
        );
      }

      try {
        const completedAt = senderTransaction.createdAt ?? new Date();

        await this.emailService.sendTransferSentEmail({
          toEmail: sender.email,

          recipientUsername: sender.username,

          amount: transferAmount,

          counterpartyUsername: receiver.username,

          counterpartyEmail: receiver.email,

          description: description || `Transfer to ${receiver.email}`,

          transactionId: senderTransactionId,

          completedAt,
        });

        await this.emailService.sendTransferReceivedEmail({
          toEmail: receiver.email,

          recipientUsername: receiver.username,

          amount: transferAmount,

          counterpartyUsername: sender.username,

          counterpartyEmail: sender.email,

          description: description || `Transfer from ${sender.email}`,

          transactionId: receiverTransactionId,

          completedAt,
        });
      } catch (emailError) {
        this.logger.error('Unexpected transfer email error', emailError);
      }

      return {
        senderTransactionId,
        receiverTransactionId,
        amount: transferAmount,
        senderBalance: newSenderBalance.toString(),
        receiverBalance: newReceiverBalance.toString(),

        cancellableUntil,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private generateTransactionId(): string {
    return `TXN${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;
  }
}
