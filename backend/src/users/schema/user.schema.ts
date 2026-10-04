import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../../common/enums/enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({
    required: true,
    unique: true,
    trim: true,
  })
  username!: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  })
  email!: string;

  @Prop({
    required: true,
    select: false,
  })
  password!: string;

  @Prop({
    required: true,
    enum: UserRole,
    default: UserRole.USER,
  })
  role!: UserRole;

  @Prop({
    default: false,
  })
  isOnline!: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  lastSeen!: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
