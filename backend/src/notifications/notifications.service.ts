import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schema/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(
    userId: string | Types.ObjectId,
    type: NotificationType,
    title: string,
    message: string,
    relatedId?: string | Types.ObjectId,
  ) {
    return this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      type,
      title,
      message,
      relatedId: relatedId ? new Types.ObjectId(relatedId) : undefined,
      read: false,
    });
  }

  async getUserNotifications(userId: string) {
    return this.notificationModel
      .find({
        userId: new Types.ObjectId(userId),
      })
      .sort({
        createdAt: -1,
      })
      .limit(50)
      .lean();
  }

  async getUnreadCount(userId: string) {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      {
        $set: {
          read: true,
        },
      },
      {
        new: true,
      },
    );
  }

  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        read: false,
      },
      {
        $set: {
          read: true,
        },
      },
    );

    return {
      success: true,
    };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const result = await this.notificationModel.findOneAndDelete({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    });

    if (!result) {
      throw new NotFoundException('Notification not found');
    }

    return {
      success: true,
    };
  }

  async clearAllNotifications(userId: string) {
    await this.notificationModel.deleteMany({
      userId: new Types.ObjectId(userId),
    });

    return {
      success: true,
    };
  }
}
