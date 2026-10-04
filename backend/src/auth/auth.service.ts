import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from '../users/schema/user.schema';

import { Wallet, WalletDocument } from '../wallet/schema/wallet.schema';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import { UserRole } from '../common/enums/enums';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    @InjectModel(Wallet.name)
    private walletModel: Model<WalletDocument>,

    private jwtService: JwtService,

    private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;

    const existingUser = await this.userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('Username already exists');
      }

      if (existingUser.email === email) {
        throw new ConflictException('Email already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new this.userModel({
      username,
      email,
      password: hashedPassword,
      role: UserRole.USER,
    });

    const savedUser = await newUser.save();

    const newWallet = new this.walletModel({
      userId: savedUser._id,
      balance: '0',
    });

    const savedWallet = await newWallet.save();

    try {
      const emailResult = await this.emailService.sendRegistrationEmail({
        email: savedUser.email,
        username: savedUser.username,
      });

      if (!emailResult.success) {
        this.logger.warn(
          `Registration email failed for ${savedUser.email}: ${emailResult.error}`,
        );
      }
    } catch (error) {
      this.logger.error('Unexpected registration email error', error);
    }

    return {
      id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role,
      walletId: savedWallet._id,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email }).select('+password');

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const wallet = await this.walletModel.findOne({
      userId: user._id,
    });

    if (!wallet) {
      throw new UnauthorizedException('Wallet not found for this user');
    }

    const role = user.role ?? UserRole.USER;

    const token = this.jwtService.sign({
      userId: user._id.toString(),
      role,
    });

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role,
      walletId: wallet._id,
      token,
    };
  }

  async changeEmail(userId: string, changeEmailDto: ChangeEmailDto) {
    const { email } = changeEmailDto;

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.email === email) {
      throw new ConflictException(
        'New email must be different from current email',
      );
    }

    const existingUser = await this.userModel.findOne({ email });

    if (existingUser) {
      throw new ConflictException('Email already in use by another account');
    }

    user.email = email;
    await user.save();

    try {
      const emailResult = await this.emailService.sendEmailChangeNotification({
        email: user.email,
        username: user.username,
      });

      if (!emailResult.success) {
        this.logger.warn(
          `Email change notification failed for ${user.email}: ${emailResult.error}`,
        );
      }
    } catch (error) {
      this.logger.error('Unexpected email change notification error', error);
    }

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'New password and confirmation do not match',
      );
    }

    const user = await this.userModel.findById(userId).select('+password');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    try {
      const emailResult =
        await this.emailService.sendPasswordChangeNotification({
          email: user.email,
          username: user.username,
        });

      if (!emailResult.success) {
        this.logger.warn(
          `Password change notification failed for ${user.email}: ${emailResult.error}`,
        );
      }
    } catch (error) {
      this.logger.error('Unexpected password change notification error', error);
    }

    return {
      message: 'Password changed successfully',
    };
  }
}
