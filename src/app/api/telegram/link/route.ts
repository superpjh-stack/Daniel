import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateLinkCode } from '@/lib/telegram/auth';
import { getActiveTelegramLinks } from '@/lib/db';
import { isBotConfigured } from '@/lib/telegram/bot';

export async function POST() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'teacher')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isBotConfigured()) {
      return NextResponse.json(
        { error: 'Telegram 봇이 설정되지 않았습니다. TELEGRAM_BOT_TOKEN 환경변수를 확인하세요.' },
        { status: 503 }
      );
    }

    const code = await generateLinkCode(session.id);
    return NextResponse.json({ code, expiresIn: 300 });
  } catch (error) {
    console.error('Telegram link error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configured = isBotConfigured();
    const links = configured ? await getActiveTelegramLinks() : [];

    return NextResponse.json({ configured, links });
  } catch (error) {
    console.error('Telegram link GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
