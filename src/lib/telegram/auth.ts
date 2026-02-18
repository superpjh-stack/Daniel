import {
  getTelegramLinkByChatId,
  getSettingValue,
  upsertSetting,
} from '@/lib/db';
import { prisma } from '@/lib/db';

interface TelegramUser {
  userId: string;
  userName: string;
  userRole: string;
}

export async function verifyTelegramUser(chatId: string): Promise<TelegramUser | null> {
  const link = await getTelegramLinkByChatId(chatId);
  if (!link) return null;
  return {
    userId: link.user.id,
    userName: link.user.name,
    userRole: link.user.role,
  };
}

export async function generateLinkCode(userId: string): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동 방지 (0,O,1,I 제외)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5분
  await upsertSetting(`telegram_link_${code}`, `${userId}|${expiresAt}`);
  return code;
}

export async function validateAndConsumeLinkCode(
  code: string
): Promise<{ userId: string } | null> {
  const key = `telegram_link_${code.toUpperCase()}`;
  const value = await getSettingValue(key, '');
  if (!value) return null;

  const [userId, expiresAt] = value.split('|');
  if (!userId || !expiresAt) return null;

  // 만료 확인
  if (new Date(expiresAt) < new Date()) {
    // 만료된 코드 삭제
    await prisma.setting.deleteMany({ where: { key } });
    return null;
  }

  // 사용 후 삭제
  await prisma.setting.deleteMany({ where: { key } });
  return { userId };
}

export function requireRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}
