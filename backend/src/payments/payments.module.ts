import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { Transaction, TransactionSchema } from './schema/transaction.schema';

import { User, UserSchema } from '../users/schema/user.schema';

import { WalletModule } from '../wallet/wallet.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Transaction.name,
        schema: TransactionSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),

    forwardRef(() => WalletModule),

    EmailModule,
    NotificationsModule,
  ],

  controllers: [PaymentsController],

  providers: [PaymentsService],

  exports: [MongooseModule, PaymentsService],
})
export class PaymentsModule {}
