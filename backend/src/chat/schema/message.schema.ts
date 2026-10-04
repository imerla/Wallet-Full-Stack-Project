import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document, Types } from 'mongoose';

import { UserRole } from '../../common/enums/enums';

export type MessageDocument = Message & Document;

@Schema({
  timestamps: true,
})
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
  })
  conversationId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  senderId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: UserRole,
  })
  senderRole!: UserRole;

  @Prop({
    required: true,
    trim: true,
    maxlength: 2000,
  })
  content!: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({
  conversationId: 1,
  createdAt: 1,
});
