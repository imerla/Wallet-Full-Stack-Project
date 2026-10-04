import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document, Types } from 'mongoose';

import { MoneyRequestStatus } from '../../common/enums/enums';

export type MoneyRequestDocument = MoneyRequest & Document;

@Schema({
  timestamps: true,
})
export class MoneyRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  requesterId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  requestedFromId!: Types.ObjectId;

  @Prop({
    type: Types.Decimal128,
    required: true,
  })
  amount!: Types.Decimal128;

  @Prop({
    required: true,
    maxlength: 500,
  })
  description!: string;

  @Prop({
    required: true,
    enum: MoneyRequestStatus,
    default: MoneyRequestStatus.PENDING,
  })
  status!: MoneyRequestStatus;

  @Prop({
    type: Date,
    default: null,
  })
  respondedAt!: Date | null;

  @Prop({
    type: Date,
    default: null,
  })
  cancelledAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MoneyRequestSchema = SchemaFactory.createForClass(MoneyRequest);

MoneyRequestSchema.index({
  requesterId: 1,
  status: 1,
});

MoneyRequestSchema.index({
  requestedFromId: 1,
  status: 1,
});

MoneyRequestSchema.index({
  createdAt: -1,
});
