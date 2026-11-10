import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth/session';
import { ConversationRepository, ChatMessageRepository } from '@/lib/db/repositories';
import type { Conversation } from '@/lib/schema/entities';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user?.id || 'usr_dev_local';
    const workspaceId = request.nextUrl.searchParams.get('workspaceId') || undefined;

    const conversations = ConversationRepository.listByUser(userId, workspaceId);

    // Attach message counts
    const withCounts = conversations.map((c) => {
      const messages = ChatMessageRepository.listByConversation(c.id);
      return {
        ...c,
        messageCount: messages.length,
        lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
      };
    });

    return NextResponse.json({
      success: true,
      conversations: withCounts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user?.id || 'usr_dev_local';

    const body = await request.json();
    const { id, title, workspaceId = 'ws_default', projectId, agentRole = 'coder' } = body;

    const now = Date.now();

    if (id) {
      // Update existing conversation
      const existing = ConversationRepository.findById(id);
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found' },
          { status: 404 }
        );
      }
      if (existing.userId !== userId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const updated = ConversationRepository.save({
        ...existing,
        title: title || existing.title,
        agentRole: agentRole || existing.agentRole,
        updatedAt: now,
      });

      return NextResponse.json({ success: true, conversation: updated });
    }

    // Create new conversation
    const newId = `conv_${crypto.randomBytes(6).toString('hex')}`;
    const newConv: Conversation = {
      id: newId,
      workspaceId,
      projectId,
      userId,
      title: title?.trim() || 'New Chat Session',
      agentRole,
      createdAt: now,
      updatedAt: now,
    };

    const saved = ConversationRepository.save(newConv);

    return NextResponse.json({ success: true, conversation: saved }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save conversation' },
      { status: 500 }
    );
  }
}
