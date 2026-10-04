import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import {
  TransactionType,
  TransactionStatus,
  TransactionFlowType,
} from '../../common/enums/enums';

export interface PopulatedUser {
  username: string;
  email: string;
}

export type TransactionDocument = Transaction & Document;

@Schema({
  timestamps: true,
})
export class Transaction {
  @Prop({
    required: true,
    unique: true,
  })
  transactionId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
  })
  sender?: Types.ObjectId | PopulatedUser;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
  })
  receiver?: Types.ObjectId | PopulatedUser;

  @Prop({
    type: Types.Decimal128,
    required: true,
  })
  amount!: Types.Decimal128;

  @Prop({
    required: true,
    enum: TransactionFlowType,
  })
  type!: TransactionFlowType;

  @Prop({
    required: false,
    enum: TransactionType,
  })
  transactionType?: TransactionType;

  @Prop({
    required: true,
    enum: TransactionStatus,
  })
  status!: TransactionStatus;

  @Prop({
    required: true,
  })
  description!: string;

  /*
   * Reason for rejection (for top-ups)
   */
  @Prop({
    required: false,
  })
  rejectionReason?: string;

  /*
   * Links the two sides of a transfer.
   *
   * Example:
   *
   * sender transaction:
   * TXN123
   *
   * receiver transaction:
   * TXN456
   *
   * sender.relatedTransactionId = TXN456
   * receiver.relatedTransactionId = TXN123
   */
  @Prop({
    required: false,
  })
  relatedTransactionId?: string;

  /*
   * The sender can cancel the transaction
   * only before this time.
   */
  @Prop({
    required: false,
    type: Date,
  })
  cancellableUntil?: Date;

  /*
   * Set when the transaction is cancelled.
   */
  @Prop({
    required: false,
    type: Date,
  })
  cancelledAt?: Date;

  createdAt!: Date;

  updatedAt!: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({
  userId: 1,
});

TransactionSchema.index({
  sender: 1,
});

TransactionSchema.index({
  receiver: 1,
});

TransactionSchema.index({
  createdAt: -1,
});

TransactionSchema.index({
  transactionType: 1,
});

TransactionSchema.index({
  status: 1,
});

TransactionSchema.index({
  userId: 1,
  createdAt: -1,
});

TransactionSchema.index({
  transactionType: 1,
  status: 1,
});

TransactionSchema.index({
  relatedTransactionId: 1,
});
