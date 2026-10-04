import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MoneyRequestsController } from './money-requests.controller';

import { MoneyRequestsService } from './money-requests.service';

import {
  MoneyRequest,
  MoneyRequestSchema,
} from './schema/money-request.schema';

import { User, UserSchema } from '../users/schema/user.schema';

import { Wallet, WalletSchema } from '../wallet/schema/wallet.schema';

import {
  Transaction,
  TransactionSchema,
} from '../payments/schema/transaction.schema';

import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MoneyRequest.name,
        schema: MoneyRequestSchema,
      },

      {
        name: User.name,
        schema: UserSchema,
      },

      {
        name: Wallet.name,
        schema: WalletSchema,
      },

      {
        name: Transaction.name,
        schema: TransactionSchema,
      },
    ]),

    EmailModule,
    NotificationsModule,
  ],

  controllers: [MoneyRequestsController],

  providers: [MoneyRequestsService],

  exports: [MoneyRequestsService],
})
export class MoneyRequestsModule {}
