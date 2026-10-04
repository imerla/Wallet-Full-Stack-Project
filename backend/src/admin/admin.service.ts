import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../users/schema/user.schema';

import { Wallet, WalletDocument } from '../wallet/schema/wallet.schema';

import { UserRole } from '../common/enums/enums';

interface UserWithAvailability extends UserDocument {
  isOnline: boolean;
  lastSeen: Date | null;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
  ) {}

  async getUsers(search?: string) {
    const filter: Record<string, unknown> = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');

      filter.$or = [{ username: searchRegex }, { email: searchRegex }];
    }

    const users = await this.userModel
      .find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .exec();

    const usersWithWallets = await Promise.all(
      users.map(async (user) => {
        const wallet = await this.walletModel
          .findOne({ userId: user._id })
          .exec();

        return {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role ?? UserRole.USER,
          walletId: wallet?._id ?? null,
          balance: wallet?.balance?.toString() ?? '0',
          createdAt: user.createdAt,
        };
      }),
    );

    return usersWithWallets;
  }

  async getUserById(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallet = await this.walletModel.findOne({ userId: user._id }).exec();

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role ?? UserRole.USER,
      walletId: wallet?._id ?? null,
      balance: wallet?.balance?.toString() ?? '0',
      createdAt: user.createdAt,
    };
  }

  async updateAvailability(userId: string, isOnline: boolean) {
    const now = new Date();

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        isOnline,
        lastSeen: now,
      },
      {
        new: true,
      },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user._id,
      username: user.username,
      role: user.role ?? UserRole.USER,
      isOnline: user.isOnline ?? false,
      lastSeen: user.lastSeen,
    };
  }

  async getAvailability(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('_id username role isOnline lastSeen')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user._id,
      username: user.username,
      role: user.role ?? UserRole.USER,
      isOnline: user.isOnline ?? false,
      lastSeen: user.lastSeen,
    };
  }

  async getAvailableRepresentatives() {
    const availableAdmins = await this.userModel
      .find({
        role: UserRole.ADMIN,
        isOnline: true,
      })
      .select('_id username isOnline lastSeen')
      .sort({ lastSeen: -1 })
      .exec();

    return (availableAdmins as UserWithAvailability[]).map((admin) => ({
      id: admin._id,
      username: admin.username,
      isOnline: admin.isOnline,
      lastSeen: admin.lastSeen,
    }));
  }
}
