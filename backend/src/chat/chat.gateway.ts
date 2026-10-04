import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Conversation,
  ConversationDocument,
} from './schema/conversation.schema';
import { User, UserDocument } from '../users/schema/user.schema';
import { UserRole } from '../common/enums/enums';
import { ChatService } from './chat.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  email?: string;
  role: UserRole;
}

interface JoinConversationPayload {
  conversationId: string;
}

interface SendMessagePayload {
  conversationId: string;
  content: string;
}

interface JwtPayload {
  userId: string;
  email?: string;
  role?: UserRole;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'https://wallet-full-stack-project.vercel.app',
    ],
    credentials: true,
  },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  /** userId → active socket IDs (supports multiple tabs/devices). */
  private readonly userConnections = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;

      if (!token) {
        client.emit('chatError', {
          message: 'Authentication token is required.',
        });
        client.disconnect();
        return;
      }

      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      if (!jwtSecret) {
        client.emit('chatError', { message: 'Server configuration error.' });
        client.disconnect();
        return;
      }

      const payload: JwtPayload = this.jwtService.verify(token, {
        secret: jwtSecret,
      });

      if (!payload.userId) {
        client.emit('chatError', { message: 'Invalid token payload.' });
        client.disconnect();
        return;
      }

      const socket = client as AuthenticatedSocket;
      socket.userId = payload.userId;
      socket.email = payload.email;
      socket.role = payload.role ?? UserRole.USER;

      this.registerUserConnection(socket.userId, socket.id);
      await this.setUserOnline(socket.userId, true);
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      client.emit('chatError', { message: 'Invalid or expired token.' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const socket = client as AuthenticatedSocket;
    if (socket.userId) {
      const stillConnected = this.unregisterUserConnection(
        socket.userId,
        socket.id,
      );
      if (!stillConnected) {
        await this.setUserOnline(socket.userId, false);
      }
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody() payload: JoinConversationPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const socket = client as AuthenticatedSocket;

    try {
      await this.assertConversationParticipant(
        payload.conversationId,
        socket.userId,
      );

      const roomName = `conversation:${payload.conversationId}`;
      socket.join(roomName);
    } catch (error) {
      this.emitChatError(socket, error, 'Failed to join conversation.');
    }
  }

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @MessageBody() payload: JoinConversationPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const socket = client as AuthenticatedSocket;

    try {
      if (!Types.ObjectId.isValid(payload.conversationId)) {
        socket.emit('chatError', { message: 'Invalid conversation ID.' });
        return;
      }

      const roomName = `conversation:${payload.conversationId}`;
      socket.leave(roomName);
    } catch (error) {
      this.emitChatError(socket, error, 'Failed to leave conversation.');
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() payload: SendMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const socket = client as AuthenticatedSocket;

    try {
      const trimmedContent = payload.content.trim();

      if (!trimmedContent) {
        socket.emit('chatError', { message: 'Message cannot be empty.' });
        return;
      }

      if (trimmedContent.length > 2000) {
        socket.emit('chatError', {
          message: 'Message is too long (max 2000 characters).',
        });
        return;
      }

      const savedMessage = await this.chatService.sendMessage(
        payload.conversationId,
        socket.userId,
        socket.role,
        trimmedContent,
      );

      const roomName = `conversation:${payload.conversationId}`;
      this.server.to(roomName).emit('newMessage', savedMessage);
    } catch (error) {
      this.emitChatError(socket, error, 'Failed to send message.');
    }
  }

  notifyConversationClosed(conversationId: string, closedAt: Date) {
    const roomName = `conversation:${conversationId}`;
    this.server.to(roomName).emit('conversationClosed', {
      conversationId,
      closedAt: closedAt.toISOString(),
    });
  }

  private registerUserConnection(userId: string, socketId: string): void {
    let connections = this.userConnections.get(userId);
    if (!connections) {
      connections = new Set<string>();
      this.userConnections.set(userId, connections);
    }
    connections.add(socketId);
  }

  /** @returns true if the user still has at least one active connection */
  private unregisterUserConnection(userId: string, socketId: string): boolean {
    const connections = this.userConnections.get(userId);
    if (!connections) {
      return false;
    }
    connections.delete(socketId);
    if (connections.size === 0) {
      this.userConnections.delete(userId);
      return false;
    }
    return true;
  }

  private async setUserOnline(
    userId: string,
    isOnline: boolean,
  ): Promise<void> {
    try {
      await this.userModel.findByIdAndUpdate(userId, {
        isOnline,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error('Failed to update user online status:', error);
    }
  }

  private async assertConversationParticipant(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new HttpException('Invalid conversation ID.', 400);
    }

    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();

    if (!conversation) {
      throw new HttpException('Conversation not found.', 404);
    }

    const userObjectId = new Types.ObjectId(userId);
    const isParticipant =
      conversation.userId.equals(userObjectId) ||
      conversation.adminId.equals(userObjectId);

    if (!isParticipant) {
      throw new HttpException(
        'You are not a participant in this conversation.',
        403,
      );
    }
  }

  private emitChatError(
    socket: AuthenticatedSocket,
    error: unknown,
    fallbackMessage: string,
  ): void {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof ForbiddenException ||
      error instanceof HttpException
    ) {
      const response = error.getResponse();
      const message = this.extractExceptionMessage(response);
      socket.emit('chatError', { message });
      return;
    }

    console.error(fallbackMessage, error);
    socket.emit('chatError', { message: fallbackMessage });
  }

  private extractExceptionMessage(response: string | object): string {
    if (typeof response === 'string') {
      return response;
    }
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const msg = (response as { message: string | string[] }).message;
      if (Array.isArray(msg)) {
        return msg.join(', ');
      }
      if (typeof msg === 'string') {
        return msg;
      }
    }
    return 'Request failed.';
  }
}
