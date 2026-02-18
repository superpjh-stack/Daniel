import { NextRequest, NextResponse } from 'next/server';
import { isBotConfigured, sendHTMLMessage } from '@/lib/telegram/bot';
import type { TelegramUpdate } from '@/lib/telegram/bot';
import { parseCommand, routeCommand } from '@/lib/telegram/commands';
import type { CommandContext } from '@/lib/telegram/commands';

export async function POST(request: NextRequest) {
  // 봇 미설정 시 서비스 불가
  if (!isBotConfigured()) {
    return NextResponse.json({ error: 'Bot not configured' }, { status: 503 });
  }

  // Webhook 시크릿 검증
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
    if (headerSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const update: TelegramUpdate = await request.json();

    // 텍스트 메시지만 처리
    if (!update.message?.text || !update.message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(update.message.chat.id);
    const text = update.message.text;
    const username = update.message.from?.username;

    const startTime = Date.now();

    // 명령어 파싱
    const parsed = parseCommand(text);
    if (!parsed) {
      // 명령어가 아닌 일반 텍스트는 무시
      return NextResponse.json({ ok: true });
    }

    const context: CommandContext = {
      chatId,
      username,
    };

    // 명령어 라우팅 및 처리
    const response = await routeCommand(parsed, context);

    // 응답 전송
    await sendHTMLMessage(chatId, response);

    const elapsed = Date.now() - startTime;
    console.log(`[Telegram] 명령: ${text}, chatId: ${chatId}, 처리시간: ${elapsed}ms`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram] webhook error:', error);

    // 에러가 발생해도 Telegram에 200을 반환해야 재전송을 방지함
    return NextResponse.json({ ok: true });
  }
}
