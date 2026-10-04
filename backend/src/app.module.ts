import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { EmailModule } from './email/email.module';
import { MoneyRequestsModule } from './money-requests/money-requests.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRoot(process.env.MONGO_URI!),

    UsersModule,
    WalletModule,
    AuthModule,
    PaymentsModule,
    AdminModule,
    ChatModule,
    EmailModule,
    MoneyRequestsModule,
    NotificationsModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
