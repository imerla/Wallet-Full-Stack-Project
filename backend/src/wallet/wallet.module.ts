import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

import { Wallet, WalletSchema } from './schema/wallet.schema';

import { UsersModule } from '../users/users.module';
import { PaymentsModule } from '../payments/payments.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Wallet.name,
        schema: WalletSchema,
      },
    ]),

    UsersModule,

    forwardRef(() => PaymentsModule),

    EmailModule,
    NotificationsModule,
  ],

  controllers: [WalletController],

  providers: [WalletService],

  exports: [MongooseModule],
})
export class WalletModule {}
