import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  MONEY_RECEIVED = 'MONEY_RECEIVED',
  MONEY_SENT = 'MONEY_SENT',
  MONEY_REQUEST_RECEIVED = 'MONEY_REQUEST_RECEIVED',
  MONEY_REQUEST_ACCEPTED = 'MONEY_REQUEST_ACCEPTED',
  MONEY_REQUEST_REJECTED = 'MONEY_REQUEST_REJECTED',
  MONEY_REQUEST_CANCELLED = 'MONEY_REQUEST_CANCELLED',
  TRANSFER_CANCELLED = 'TRANSFER_CANCELLED',
  SUPPORT_MESSAGE = 'SUPPORT_MESSAGE',
  TOP_UP_PENDING = 'TOP_UP_PENDING',
  TOP_UP_SUCCESS = 'TOP_UP_SUCCESS',
  TOP_UP_REJECTED = 'TOP_UP_REJECTED',
}

@Schema({
  timestamps: true,
})
export class Notification {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: NotificationType,
    required: true,
  })
  type!: NotificationType;

  @Prop({
    required: true,
  })
  title!: string;

  @Prop({
    required: true,
  })
  message!: string;

  @Prop({
    type: Types.ObjectId,
    required: false,
  })
  relatedId?: Types.ObjectId;

  @Prop({
    default: false,
  })
  read!: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
