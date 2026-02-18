import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteTelegramLinkByChatId } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await request.json();
    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
    }

    await deleteTelegramLinkByChatId(chatId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram unlink error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
