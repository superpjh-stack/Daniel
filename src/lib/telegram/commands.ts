import { verifyTelegramUser, requireRole } from './auth';
import * as handlers from './handlers';

export interface ParsedCommand {
  command: string;
  args: string[];
  rawText: string;
}

export interface CommandContext {
  chatId: string;
  username?: string;
  userId?: string;
  userRole?: string;
  userName?: string;
}

const COMMAND_ALIASES: Record<string, string> = {
  'start': 'start',
  '시작': 'start',
  '연결': 'link',
  '해제': 'unlink',
  '도움말': 'help',
  'help': 'help',
  '출석': 'attendance',
  '달란트': 'talent',
  '지급': 'give',
  '차감': 'deduct',
  '학생': 'students',
  '요약': 'summary',
  '랭킹': 'ranking',
  '공지': 'announce',
};

export function parseCommand(text: string): ParsedCommand | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;

  // "/명령어@botname args" 형태 처리
  const withoutSlash = trimmed.substring(1);
  const parts = withoutSlash.split(/\s+/);
  const rawCmd = parts[0].split('@')[0].toLowerCase();
  const args = parts.slice(1);

  const command = COMMAND_ALIASES[rawCmd];
  if (!command) return null;

  return { command, args, rawText: trimmed };
}

// 인증 불필요 명령어
const PUBLIC_COMMANDS = new Set(['start', 'link']);

// admin 전용 명령어
const ADMIN_ONLY_COMMANDS = new Set(['deduct', 'announce']);

export async function routeCommand(
  parsed: ParsedCommand,
  context: CommandContext
): Promise<string> {
  // 공개 명령어는 인증 없이 처리
  if (PUBLIC_COMMANDS.has(parsed.command)) {
    if (parsed.command === 'start') {
      return handlers.handleStart(context);
    }
    if (parsed.command === 'link') {
      if (parsed.args.length === 0) {
        return '연결코드를 입력해주세요.\n예: <code>/연결 ABC123</code>';
      }
      return handlers.handleLink(parsed.args[0], context);
    }
  }

  // 나머지 명령어는 인증 필요
  const user = await verifyTelegramUser(context.chatId);
  if (!user) {
    return '🔗 연결되지 않았습니다.\n<code>/start</code> 로 시작하세요.';
  }

  context.userId = user.userId;
  context.userRole = user.userRole;
  context.userName = user.userName;

  // admin 전용 명령어 권한 확인
  if (ADMIN_ONLY_COMMANDS.has(parsed.command) && !requireRole(user.userRole, ['admin'])) {
    return '🔒 <b>권한이 없습니다</b>\n\n이 명령어는 관리자만 사용할 수 있습니다.';
  }

  // teacher 이상 권한 확인
  if (!requireRole(user.userRole, ['admin', 'teacher'])) {
    return '🔒 <b>권한이 없습니다</b>\n\n이 명령어는 교사 이상만 사용할 수 있습니다.';
  }

  switch (parsed.command) {
    case 'help':
      return handlers.handleHelp(context);
    case 'attendance':
      return handlers.handleAttendance(context);
    case 'talent':
      return handlers.handleTalentQuery(parsed.args, context);
    case 'give':
      return handlers.handleGiveTalent(parsed.args, context);
    case 'deduct':
      return handlers.handleDeductTalent(parsed.args, context);
    case 'students':
      return handlers.handleStudents(parsed.args, context);
    case 'summary':
      return handlers.handleSummary(context);
    case 'ranking':
      return handlers.handleRanking(context);
    case 'announce':
      return handlers.handleAnnounce(parsed.args, parsed.rawText, context);
    case 'unlink':
      return handlers.handleUnlink(context);
    default:
      return '❓ 알 수 없는 명령어입니다.\n<code>/도움말</code> 로 사용 가능한 명령어를 확인하세요.';
  }
}
