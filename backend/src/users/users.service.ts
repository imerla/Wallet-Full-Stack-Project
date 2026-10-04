import { Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import Fuse from 'fuse.js';

import { User, UserDocument } from './schema/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async searchUsers(currentUserId: string, query: string) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    const users = await this.userModel
      .find({
        _id: {
          $ne: currentUserId,
        },
      })
      .select('_id username email')
      .lean();

    const fuse = new Fuse(users, {
      keys: [
        {
          name: 'username',
          weight: 0.7,
        },
        {
          name: 'email',
          weight: 0.3,
        },
      ],

      threshold: 0.1,

      ignoreLocation: true,

      minMatchCharLength: 3,
    });

    const results = fuse
      .search(normalizedQuery)
      .slice(0, 10)
      .map((result) => ({
        id: result.item._id,
        username: result.item.username,
        email: result.item.email,
      }));

    return results;
  }
}
