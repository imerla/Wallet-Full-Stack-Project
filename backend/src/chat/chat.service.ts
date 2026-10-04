import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
  Inject,
  forwardRef,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types, FilterQuery } from 'mongoose';

import {
  Conversation,
  ConversationDocument,
} from './schema/conversation.schema';

import { Message, MessageDocument } from './schema/message.schema';

import { User, UserDocument } from '../users/schema/user.schema';

import { UserRole, ConversationStatus } from '../common/enums/enums';

import { ChatGateway } from './chat.gateway';

import { NotificationsService } from '../notifications/notifications.service';

import { NotificationType } from '../notifications/schema/notification.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,

    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,

    private readonly notificationsService: NotificationsService,
  ) {}

  async createConversation(userId: string, name: string, description: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID.');
    }

    const userObjectId = new Types.ObjectId(userId);

    const user = await this.userModel
      .findById(userObjectId)
      .select('_id role')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role !== UserRole.USER) {
      throw new ForbiddenException(
        'Only normal users can start support conversations.',
      );
    }

    const existingConversation = await this.conversationModel
      .findOne({
        userId: userObjectId,
        status: ConversationStatus.OPEN,
      })
      .exec();

    if (existingConversation) {
      throw new BadRequestException(
        'You already have an open conversation. Please close it before starting a new one.',
      );
    }

    const availableAdmins = await this.userModel
      .find({
        role: UserRole.ADMIN,
        isOnline: true,
      })
      .select('_id username isOnline lastSeen')
      .exec();

    if (availableAdmins.length === 0) {
      throw new ServiceUnavailableException(
        'No bank representatives are currently available.',
      );
    }

    const randomIndex = Math.floor(Math.random() * availableAdmins.length);

    const selectedAdmin = availableAdmins[randomIndex];

    const newConversation = new this.conversationModel({
      userId: userObjectId,
      adminId: selectedAdmin._id,
      status: ConversationStatus.OPEN,
      name: name?.trim() || 'General Support',
      description: description?.trim() || '',
      closedAt: null,
    });

    return newConversation.save();
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: UserRole,
    content: string,
  ) {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Invalid conversation ID.');
    }

    if (!Types.ObjectId.isValid(senderId)) {
      throw new BadRequestException('Invalid sender ID.');
    }

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw new BadRequestException('Message cannot be empty.');
    }

    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException('Conversation is closed.');
    }

    const senderObjectId = new Types.ObjectId(senderId);

    const isParticipant =
      conversation.userId.equals(senderObjectId) ||
      conversation.adminId.equals(senderObjectId);

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation.',
      );
    }

    const isUser = conversation.userId.equals(senderObjectId);

    const isAdmin = conversation.adminId.equals(senderObjectId);

    if (
      (isUser && senderRole !== UserRole.USER) ||
      (isAdmin && senderRole !== UserRole.ADMIN)
    ) {
      throw new ForbiddenException('Invalid sender role.');
    }

    const newMessage = new this.messageModel({
      conversationId: new Types.ObjectId(conversationId),

      senderId: senderObjectId,

      senderRole,

      content: trimmedContent,
    });

    const savedMessage = await newMessage.save();

    if (isAdmin && conversation.userId) {
      try {
        await this.notificationsService.create(
          conversation.userId,
          NotificationType.SUPPORT_MESSAGE,
          'New Support Message',
          'Your support representative sent you a new message.',
          conversationId,
        );
      } catch (notificationError) {
        console.error(
          'Failed to create support message notification:',
          notificationError,
        );
      }
    }

    return savedMessage;
  }

  async getConversationMessages(conversationId: string, userId: string) {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Invalid conversation ID.');
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID.');
    }

    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const userObjectId = new Types.ObjectId(userId);

    const isParticipant =
      conversation.userId.equals(userObjectId) ||
      conversation.adminId.equals(userObjectId);

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation.',
      );
    }

    return this.messageModel
      .find({
        conversationId: new Types.ObjectId(conversationId),
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  async getConversations(userId: string, userRole: UserRole) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID.');
    }

    const userObjectId = new Types.ObjectId(userId);

    const filter: FilterQuery<ConversationDocument> = {};

    if (userRole === UserRole.USER) {
      filter.userId = userObjectId;
    } else if (userRole === UserRole.ADMIN) {
      filter.adminId = userObjectId;
    } else {
      throw new ForbiddenException('Invalid user role.');
    }

    return this.conversationModel.find(filter).sort({ updatedAt: -1 }).exec();
  }

  async getConversation(conversationId: string, userId: string) {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Invalid conversation ID.');
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID.');
    }

    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const userObjectId = new Types.ObjectId(userId);

    const isParticipant =
      conversation.userId.equals(userObjectId) ||
      conversation.adminId.equals(userObjectId);

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation.',
      );
    }

    return conversation;
  }

  async closeConversation(conversationId: string, userId: string) {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Invalid conversation ID.');
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID.');
    }

    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const userObjectId = new Types.ObjectId(userId);

    const isParticipant =
      conversation.userId.equals(userObjectId) ||
      conversation.adminId.equals(userObjectId);

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation.',
      );
    }

    if (conversation.status === ConversationStatus.CLOSED) {
      return conversation;
    }

    conversation.status = ConversationStatus.CLOSED;

    conversation.closedAt = new Date();

    try {
      await conversation.save();
    } catch (saveError) {
      console.error('Error saving conversation:', saveError);
      throw new BadRequestException(
        'Failed to close conversation. Please try again.',
      );
    }

    this.chatGateway.notifyConversationClosed(
      conversationId,
      conversation.closedAt,
    );

    return conversation;
  }
}
