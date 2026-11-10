import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { ConversationRepository, ChatMessageRepository } from '@/lib/db/repositories';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser(request);
    const userId = user?.id || 'usr_dev_local';

    const conversation = ConversationRepository.findById(id);
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.userId !== userId && conversation.userId !== 'usr_dev_local') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const messages = ChatMessageRepository.listByConversation(id);

    return NextResponse.json({
      success: true,
      conversation,
      messages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser(request);
    const userId = user?.id || 'usr_dev_local';

    const conversation = ConversationRepository.findById(id);
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.userId !== userId && conversation.userId !== 'usr_dev_local') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const deleted = ConversationRepository.delete(id);

    return NextResponse.json({
      success: true,
      deleted,
      conversationId: id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
