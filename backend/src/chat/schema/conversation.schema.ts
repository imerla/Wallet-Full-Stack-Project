import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document, Types } from 'mongoose';

import { ConversationStatus } from '../../common/enums/enums';

export type ConversationDocument = Conversation & Document;

@Schema({
  timestamps: true,
})
export class Conversation {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  adminId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ConversationStatus,
    default: ConversationStatus.OPEN,
    index: true,
  })
  status!: ConversationStatus;

  @Prop({
    type: String,
    required: false,
    default: 'General Support',
  })
  name!: string;

  @Prop({
    type: String,
    required: false,
    default: '',
  })
  description!: string;

  @Prop({
    type: Date,
    default: null,
  })
  closedAt!: Date | null;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({
  userId: 1,
  status: 1,
});

ConversationSchema.index({
  adminId: 1,
  status: 1,
});
