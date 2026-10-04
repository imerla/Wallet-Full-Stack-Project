import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.Decimal128, required: true, default: '0' })
  balance!: Types.Decimal128;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
