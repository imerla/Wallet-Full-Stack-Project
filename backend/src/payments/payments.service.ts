import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import Decimal from 'decimal.js';

import {
  Transaction,
  TransactionDocument,
  PopulatedUser,
} from './schema/transaction.schema';

import { Wallet, WalletDocument } from '../wallet/schema/wallet.schema';

import { User, UserDocument } from '../users/schema/user.schema';

import { CheckoutDto } from './dto/checkout.dto';
import { WebhookDto } from './dto/webhook.dto';
import { TransactionsQueryDto } from './dto/transactions-query.dto';

import {
  TransactionType,
  TransactionStatus,
  TransactionFlowType,
  UserRole,
} from '../common/enums/enums';

import { EmailService } from '../email/email.service';

import { NotificationsService } from '../notifications/notifications.service';

import { NotificationType } from '../notifications/schema/notification.schema';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,

    @InjectModel(Wallet.name)
    private walletModel: Model<WalletDocument>,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    private readonly emailService: EmailService,

    private readonly notificationsService: NotificationsService,
  ) {}

  async checkout(userId: string, checkoutDto: CheckoutDto) {
    const { amount } = checkoutDto;

    const transactionId = this.generateTransactionId();

    const newTransaction = new this.transactionModel({
      transactionId,

      userId: new Types.ObjectId(userId),

      receiver: new Types.ObjectId(userId),

      amount: amount.toString(),

      type: TransactionFlowType.INCOME,

      transactionType: TransactionType.TOP_UP,

      status: TransactionStatus.PENDING,

      description: 'Wallet top-up',
    });

    const savedTransaction = await newTransaction.save();

    const { userId: _, ...transactionWithoutUserId } =
      savedTransaction.toObject();

    try {
      const admins = await this.userModel.find({ role: UserRole.ADMIN });
      const user = await this.userModel.findById(userId);

      for (const admin of admins) {
        await this.notificationsService.create(
          admin._id,
          NotificationType.TOP_UP_PENDING,
          'New Top-Up Request',
          `User ${user?.username || userId} requested a top-up of $${amount}. Transaction ID: ${transactionId}`,
          savedTransaction._id,
        );
      }
    } catch (notificationError) {
      this.logger.error(
        'Failed to send top-up notification to admins',
        notificationError,
      );
    }

    return {
      transactionId: transactionWithoutUserId.transactionId,

      amount: transactionWithoutUserId.amount,

      status: transactionWithoutUserId.status,
    };
  }

  async webhook(webhookDto: WebhookDto) {
    const { transaction_id, status, rejection_reason } = webhookDto;

    const transaction = await this.transactionModel.findOne({
      transactionId: transaction_id,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (status === 'SUCCESS') {
      const session = await this.transactionModel.db.startSession();

      session.startTransaction();

      try {
        const updatedTransaction = await this.transactionModel.findOneAndUpdate(
          {
            transactionId: transaction_id,
            status: TransactionStatus.PENDING,
          },
          {
            $set: {
              status: TransactionStatus.COMPLETED,
            },
          },
          {
            session,
            new: true,
          },
        );

        if (!updatedTransaction) {
          await session.abortTransaction();

          const currentTransaction = await this.transactionModel.findOne({
            transactionId: transaction_id,
          });

          if (!currentTransaction) {
            throw new NotFoundException('Transaction not found');
          }

          const { userId, ...transactionWithoutUserId } =
            currentTransaction.toObject();
          return transactionWithoutUserId;
        }

        const wallet = await this.walletModel
          .findOne({
            userId: new Types.ObjectId(updatedTransaction.userId),
          })
          .session(session);

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        const currentBalance = wallet.balance.toString();

        const transactionAmount = updatedTransaction.amount.toString();

        const newBalance = this.addDecimalStrings(
          currentBalance,
          transactionAmount,
        );

        wallet.balance = newBalance as any;

        await wallet.save({
          session,
        });

        await session.commitTransaction();

        try {
          const user = await this.userModel.findById(updatedTransaction.userId);

          if (user) {
            const emailResult = await this.emailService.sendTopUpSuccessEmail({
              toEmail: user.email,
              username: user.username,
              amount: updatedTransaction.amount.toString(),
              transactionId: updatedTransaction.transactionId,
              completedAt: updatedTransaction.createdAt ?? new Date(),
            });

            if (!emailResult.success) {
              this.logger.warn(
                `Top-up email failed for ${user.email}: ${emailResult.error}`,
              );
            }
          }
        } catch (emailError) {
          this.logger.error('Unexpected top-up email error', emailError);
        }

        try {
          await this.notificationsService.create(
            updatedTransaction.userId,
            NotificationType.TOP_UP_SUCCESS,
            'Top-Up Successful',
            `Your wallet top-up of $${updatedTransaction.amount.toString()} was successful.`,
            updatedTransaction._id,
          );
        } catch (notificationError) {
          this.logger.warn(
            'Failed to send top-up success notification to user',
            notificationError,
          );
        }

        const { userId, ...transactionWithoutUserId } =
          updatedTransaction.toObject();

        return transactionWithoutUserId;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    }

    if (status === 'REJECTED') {
      transaction.status = TransactionStatus.REJECTED;

      if (rejection_reason) {
        transaction.rejectionReason = rejection_reason;
      }

      await transaction.save();

      try {
        const message = rejection_reason
          ? `Your wallet top-up of $${transaction.amount.toString()} was rejected. Reason: ${rejection_reason}`
          : `Your wallet top-up of $${transaction.amount.toString()} was rejected.`;

        await this.notificationsService.create(
          transaction.userId,
          NotificationType.TOP_UP_REJECTED,
          'Top-Up Rejected',
          message,
          transaction._id,
        );
      } catch (notificationError) {
        this.logger.warn(
          'Failed to send top-up rejection notification to user',
          notificationError,
        );
      }

      const { userId, ...transactionWithoutUserId } = transaction.toObject();

      return transactionWithoutUserId;
    }

    const { userId, ...transactionWithoutUserId } = transaction.toObject();

    return transactionWithoutUserId;
  }

  private addDecimalStrings(a: string, b: string): string {
    const numA = new Decimal(a);
    const numB = new Decimal(b);

    return numA.plus(numB).toString();
  }

  private subtractDecimalStrings(a: string, b: string): string {
    const numA = new Decimal(a);
    const numB = new Decimal(b);

    return numA.minus(numB).toString();
  }

  private compareDecimalStrings(a: string, b: string): number {
    const numA = new Decimal(a);
    const numB = new Decimal(b);

    return numA.comparedTo(numB);
  }

  async getPendingTopUps() {
    return this.transactionModel
      .find({
        transactionType: TransactionType.TOP_UP,
        status: TransactionStatus.PENDING,
      })
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getAllTopUps(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const { page = 1, limit = 10, status, search } = query;

    const filter: any = {
      transactionType: TransactionType.TOP_UP,
    };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const searchConditions: any[] = [];

    if (search) {
      const searchRegex = new RegExp(search, 'i');

      searchConditions.push({ transactionId: searchRegex });

      const matchingUsers = await this.userModel
        .find({
          $or: [{ username: searchRegex }, { email: searchRegex }],
        })
        .select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      if (userIds.length > 0) {
        searchConditions.push({ userId: { $in: userIds } });
      }

      if (searchConditions.length > 0) {
        filter.$or = searchConditions;
      }
    }

    const [topUps, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .populate('userId', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.transactionModel.countDocuments(filter),
    ]);

    return {
      topUps,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactions(userId: string, query: TransactionsQueryDto) {
    const { page = 1, limit = 10, type, status, from, to, search } = query;

    const filter: any = {
      userId: new Types.ObjectId(userId),
    };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (from || to) {
      filter.createdAt = {};

      if (from) {
          const [year, month, day] = from.split('-').map(Number);
        filter.createdAt.$gte = new Date(year, month - 1, day, 0, 0, 0, 0);
      }

      if (to) {
          const [year, month, day] = to.split('-').map(Number);
        filter.createdAt.$lte = new Date(year, month - 1, day, 23, 59, 59, 999);
      }
    }

    const skip = (page - 1) * limit;

    const userFilter: any = {};
    const searchConditions: any[] = [];

    if (search) {
      const searchRegex = new RegExp(search, 'i');

      searchConditions.push({ transactionId: searchRegex });

      searchConditions.push({ description: searchRegex });

      const matchingUsers = await this.userModel
        .find({
          $or: [{ username: searchRegex }, { email: searchRegex }],
        })
        .select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      if (userIds.length > 0) {
        searchConditions.push({ sender: { $in: userIds } });
        searchConditions.push({ receiver: { $in: userIds } });
      }

      if (searchConditions.length > 0) {
        filter.$or = searchConditions;
      }
    }

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .populate('sender', 'username email')
        .populate('receiver', 'username email')
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .exec(),

      this.transactionModel.countDocuments(filter),
    ]);

    const transformedTransactions = transactions.map((txn) => {
      const { userId, ...transactionWithoutUserId } = txn.toObject();

      return transactionWithoutUserId;
    });

    return {
      transactions: transformedTransactions,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAnalytics(userId: string) {
    const now = new Date();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const filter: any = {
      userId: new Types.ObjectId(userId),

      status: TransactionStatus.COMPLETED,

      createdAt: {
        $gte: startOfMonth,
        $lt: endOfMonth,
      },
    };

    const [incomeTransactions, expenseTransactions, topTransactions] =
      await Promise.all([
        this.transactionModel
          .find({
            ...filter,
            type: TransactionFlowType.INCOME,
          })
          .exec(),

        this.transactionModel
          .find({
            ...filter,
            type: TransactionFlowType.EXPENSE,
          })
          .exec(),

        this.transactionModel
          .find(filter)
          .populate('sender', 'username email')
          .populate('receiver', 'username email')
          .sort({
            amount: -1,
          })
          .limit(5)
          .exec(),
      ]);

    let totalIncome = new Decimal('0');

    let totalSpending = new Decimal('0');

    for (const txn of incomeTransactions) {
      totalIncome = totalIncome.plus(new Decimal(txn.amount.toString()));
    }

    for (const txn of expenseTransactions) {
      totalSpending = totalSpending.plus(new Decimal(txn.amount.toString()));
    }

    const netBalance = totalIncome.minus(totalSpending);

    return {
      month: now.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      }),

      totalIncome: totalIncome.toString(),

      totalSpending: totalSpending.toString(),

      netBalance: netBalance.toString(),

      topTransactions: topTransactions.map((txn) => {
        const { userId, ...transactionWithoutUserId } = txn.toObject();

        return {
          transactionId: transactionWithoutUserId.transactionId,

          amount: transactionWithoutUserId.amount.toString(),

          type: transactionWithoutUserId.type,

          description: transactionWithoutUserId.description,

          sender: this.getUserName(transactionWithoutUserId.sender),

          receiver: this.getUserName(transactionWithoutUserId.receiver),

          createdAt: transactionWithoutUserId.createdAt,
        };
      }),
    };
  }

  async getTransactionStats(
    userId: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const filter: any = {
      userId: new Types.ObjectId(userId),
      status: TransactionStatus.COMPLETED,
    };

    if (fromDate) {
      const [year, month, day] = fromDate.split('-').map(Number);
      filter.createdAt = { $gte: new Date(year, month - 1, day, 0, 0, 0, 0) };
    }

    if (toDate) {
      if (!filter.createdAt) {
        filter.createdAt = {};
      }
      const [year, month, day] = toDate.split('-').map(Number);
      filter.createdAt.$lte = new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    const [incomeTransactions, expenseTransactions, allTransactions] =
      await Promise.all([
        this.transactionModel
          .find({
            ...filter,
            type: TransactionFlowType.INCOME,
          })
          .exec(),

        this.transactionModel
          .find({
            ...filter,
            type: TransactionFlowType.EXPENSE,
          })
          .exec(),

        this.transactionModel.find(filter).exec(),
      ]);

    let totalIncome = new Decimal('0');
    let totalExpense = new Decimal('0');

    for (const txn of incomeTransactions) {
      totalIncome = totalIncome.plus(new Decimal(txn.amount.toString()));
    }

    for (const txn of expenseTransactions) {
      totalExpense = totalExpense.plus(new Decimal(txn.amount.toString()));
    }

    return {
      income: parseFloat(totalIncome.toString()),
      expense: parseFloat(totalExpense.toString()),
      transactions: allTransactions.length,
    };
  }

  async exportTransactions(userId: string): Promise<string> {
    const transactions = await this.transactionModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .populate('sender', 'username email')
      .populate('receiver', 'username email')
      .sort({
        createdAt: -1,
      })
      .exec();

    const headers = [
      'transaction_id',
      'amount',
      'type',
      'status',
      'description',
      'sender',
      'receiver',
      'created_at',
    ];

    const csvRows = [headers.join(',')];

    for (const txn of transactions) {
      const { userId: _, ...transactionWithoutUserId } = txn.toObject();

      const senderName = this.getUserName(transactionWithoutUserId.sender);

      const receiverName = this.getUserName(transactionWithoutUserId.receiver);

      const row = [
        transactionWithoutUserId.transactionId,

        transactionWithoutUserId.amount.toString(),

        transactionWithoutUserId.type,

        transactionWithoutUserId.status,

        `"${transactionWithoutUserId.description.replace(/"/g, '""')}"`,

        `"${senderName.replace(/"/g, '""')}"`,

        `"${receiverName.replace(/"/g, '""')}"`,

        transactionWithoutUserId.createdAt.toISOString(),
      ];

      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  private generateTransactionId(): string {
    return `TXN${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;
  }

  private getUserName(
    user: Types.ObjectId | PopulatedUser | undefined,
  ): string {
    if (!user) {
      return 'N/A';
    }

    if (typeof user === 'object' && 'username' in user) {
      return user.username;
    }

    return 'N/A';
  }

  async cancelTransfer(userId: string, transactionId: string) {
    const session = await this.transactionModel.db.startSession();

    session.startTransaction();

    try {
      const transaction = await this.transactionModel
        .findOne({
          transactionId,
          userId: new Types.ObjectId(userId),
          transactionType: TransactionType.TRANSFER,
          type: TransactionFlowType.EXPENSE,
        })
        .session(session);

      if (!transaction) {
        throw new NotFoundException('Transfer transaction not found');
      }

      if (transaction.status === TransactionStatus.CANCELLED) {
        throw new BadRequestException(
          'This transfer has already been cancelled',
        );
      }

      if (transaction.status !== TransactionStatus.COMPLETED) {
        throw new BadRequestException(
          'Only completed transfers can be cancelled',
        );
      }

      if (!transaction.cancellableUntil) {
        throw new BadRequestException('This transfer cannot be cancelled');
      }

      if (new Date() > transaction.cancellableUntil) {
        throw new BadRequestException(
          'The 24-hour cancellation period has expired',
        );
      }

      if (!transaction.relatedTransactionId) {
        throw new BadRequestException('Related receiver transaction not found');
      }

      const receiverTransaction = await this.transactionModel
        .findOne({
          transactionId: transaction.relatedTransactionId,
        })
        .session(session);

      if (!receiverTransaction) {
        throw new NotFoundException('Related receiver transaction not found');
      }

      if (receiverTransaction.status !== TransactionStatus.COMPLETED) {
        throw new BadRequestException('The related transaction is not active');
      }

      const senderWallet = await this.walletModel
        .findOne({
          userId: transaction.sender,
        })
        .session(session);

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found');
      }

      const receiverWallet = await this.walletModel
        .findOne({
          userId: transaction.receiver,
        })
        .session(session);

      if (!receiverWallet) {
        throw new NotFoundException('Receiver wallet not found');
      }

      const amount = new Decimal(transaction.amount.toString());

      const senderBalance = new Decimal(senderWallet.balance.toString());

      const receiverBalance = new Decimal(receiverWallet.balance.toString());

      if (receiverBalance.comparedTo(amount) < 0) {
        throw new BadRequestException(
          'Cancellation cannot be completed because the receiver no longer has sufficient funds',
        );
      }

      const newSenderBalance = senderBalance.plus(amount);

      const newReceiverBalance = receiverBalance.minus(amount);

      senderWallet.balance = newSenderBalance.toString() as any;

      receiverWallet.balance = newReceiverBalance.toString() as any;

      await senderWallet.save({
        session,
      });

      await receiverWallet.save({
        session,
      });

      const cancelledAt = new Date();

      transaction.status = TransactionStatus.CANCELLED;

      transaction.cancelledAt = cancelledAt;

      transaction.cancellableUntil = undefined;

      await transaction.save({
        session,
      });

      receiverTransaction.status = TransactionStatus.CANCELLED;

      receiverTransaction.cancelledAt = cancelledAt;

      receiverTransaction.cancellableUntil = undefined;

      await receiverTransaction.save({
        session,
      });

      await session.commitTransaction();

      try {
        await Promise.all([
          this.notificationsService.create(
            transaction.sender as Types.ObjectId,
            NotificationType.TRANSFER_CANCELLED,
            'Transfer Cancelled',
            `Your transfer of $${amount.toString()} has been cancelled.`,
            transaction._id,
          ),

          this.notificationsService.create(
            transaction.receiver as Types.ObjectId,
            NotificationType.TRANSFER_CANCELLED,
            'Transfer Cancelled',
            `A transfer of $${amount.toString()} from you was cancelled.`,
            receiverTransaction._id,
          ),
        ]);
      } catch (notificationError) {
        this.logger.warn(
          'Transfer cancellation notifications failed after successful cancellation.',
          notificationError,
        );
      }

      return {
        message: 'Transfer cancelled successfully',

        transactionId: transaction.transactionId,

        relatedTransactionId: receiverTransaction.transactionId,

        amount: amount.toString(),

        senderBalance: newSenderBalance.toString(),

        receiverBalance: newReceiverBalance.toString(),

        cancelledAt,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
