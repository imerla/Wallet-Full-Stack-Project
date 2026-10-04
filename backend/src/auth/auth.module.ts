import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { EmailModule } from '../email/email.module';

import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    UsersModule,
    WalletModule,
    EmailModule,

    PassportModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error('JWT_SECRET environment variable is not set');
        }

        return {
          secret,
          signOptions: {
            expiresIn: '24h',
          },
        };
      },
    }),
  ],

  controllers: [AuthController],

  providers: [AuthService, JwtStrategy, RolesGuard],

  exports: [RolesGuard],
})
export class AuthModule {}
