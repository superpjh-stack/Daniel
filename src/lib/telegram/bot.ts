const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}

interface SendMessageOptions {
  chatId: string | number;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}

export function isBotConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

export async function sendMessage(options: SendMessageOptions): Promise<boolean> {
  if (!BOT_TOKEN) return false;

  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: options.chatId,
        text: options.text,
        parse_mode: options.parseMode || 'HTML',
      }),
    });
    return res.ok;
  } catch (error) {
    console.error('[Telegram] sendMessage error:', error);
    return false;
  }
}

export async function sendHTMLMessage(chatId: string | number, html: string): Promise<boolean> {
  return sendMessage({ chatId, text: html, parseMode: 'HTML' });
}

export async function setWebhook(url: string): Promise<{ ok: boolean; description?: string }> {
  if (!BOT_TOKEN) return { ok: false, description: 'BOT_TOKEN not configured' };

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  try {
    const res = await fetch(`${API_BASE}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        ...(secret && { secret_token: secret }),
      }),
    });
    return await res.json();
  } catch (error) {
    console.error('[Telegram] setWebhook error:', error);
    return { ok: false, description: String(error) };
  }
}
