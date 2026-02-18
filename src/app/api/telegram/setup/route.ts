import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { setWebhook, isBotConfigured } from '@/lib/telegram/bot';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isBotConfigured()) {
      return NextResponse.json(
        { error: 'TELEGRAM_BOT_TOKEN이 설정되지 않았습니다.' },
        { status: 503 }
      );
    }

    const { webhookUrl } = await request.json();
    if (!webhookUrl) {
      return NextResponse.json({ error: 'webhookUrl is required' }, { status: 400 });
    }

    const result = await setWebhook(webhookUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Telegram setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
