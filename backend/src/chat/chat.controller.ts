import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { ChatService } from './chat.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

import { UserRole } from '../common/enums/enums';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email?: string;
    role: UserRole;
  };
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  async createConversation(
    @Request() req: AuthenticatedRequest,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(
      req.user.userId,
      createConversationDto.name || 'General Support',
      createConversationDto.description || '',
    );
  }

  @Post('conversations/:conversationId/messages')
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Request() req: AuthenticatedRequest,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(
      conversationId,
      req.user.userId,
      req.user.role,
      sendMessageDto.content,
    );
  }

  @Get('conversations/:conversationId/messages')
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.getConversationMessages(
      conversationId,
      req.user.userId,
    );
  }

  @Get('conversations')
  async getConversations(@Request() req: AuthenticatedRequest) {
    return this.chatService.getConversations(req.user.userId, req.user.role);
  }

  @Get('conversations/:conversationId')
  async getConversation(
    @Param('conversationId') conversationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.getConversation(conversationId, req.user.userId);
  }

  @Patch('conversations/:conversationId/close')
  async closeConversation(
    @Param('conversationId') conversationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.closeConversation(conversationId, req.user.userId);
  }
}
