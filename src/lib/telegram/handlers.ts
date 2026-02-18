import { CommandContext } from './commands';
import { validateAndConsumeLinkCode } from './auth';
import {
  createTelegramLink,
  deleteTelegramLinkByChatId,
  getAttendanceSummaryByDate,
  findStudentsByName,
  getTalentHistory,
  updateStudentTalentBalance,
  createTalentRecord,
  getAllStudents,
  getAllClasses,
  getStudentCount,
  getTotalTalent,
  getTopStudentsByTalent,
  createAnnouncement,
} from '@/lib/db';

// ─── 공개 명령어 ───

export async function handleStart(context: CommandContext): Promise<string> {
  return [
    '<b>🏠 다니엘 교회앱 봇</b>',
    '',
    '동은교회 초등부 출석·달란트 관리 봇입니다.',
    '',
    '<b>📌 시작하기</b>',
    '1. 웹 앱 설정에서 <b>연결코드</b>를 발급받으세요',
    '2. 아래 형식으로 입력하세요:',
    '<code>/연결 ABC123</code>',
    '',
    '연결 완료 후 /도움말 로 명령어를 확인하세요.',
  ].join('\n');
}

export async function handleLink(code: string, context: CommandContext): Promise<string> {
  const result = await validateAndConsumeLinkCode(code);
  if (!result) {
    return '❌ <b>연결 실패</b>\n\n연결코드가 유효하지 않거나 만료되었습니다.\n웹 앱 설정에서 새 코드를 발급받으세요.';
  }

  await createTelegramLink(context.chatId, result.userId, context.username);
  return [
    '✅ <b>연결 완료!</b>',
    '',
    '다니엘 교회앱 계정과 연결되었습니다.',
    '<code>/도움말</code> 로 사용 가능한 명령어를 확인하세요.',
  ].join('\n');
}

export async function handleHelp(context: CommandContext): Promise<string> {
  const lines = [
    '<b>📋 사용 가능한 명령어</b>',
    '',
    '<b>📊 조회</b>',
    '/출석 — 오늘 출석 현황',
    '/달란트 {이름} — 달란트 잔액',
    '/학생 — 전체 학생 목록',
    '/학생 {반이름} — 반별 학생 목록',
    '/요약 — 오늘 통계 요약',
    '/랭킹 — 달란트 TOP 10',
    '',
    '<b>💰 관리</b>',
    '/지급 {이름} {금액} {사유}',
    '/차감 {이름} {금액} {사유}',
  ];

  if (context.userRole === 'admin') {
    lines.push('', '<b>📢 공지 (관리자)</b>', '/공지 {제목}', '(줄바꿈 후 내용)');
  }

  lines.push('', '<b>🔗 계정</b>', '/해제 — 연결 해제');
  return lines.join('\n');
}

// ─── 출석 조회 ───

export async function handleAttendance(context: CommandContext): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const summary = await getAttendanceSummaryByDate(today);

  const checked = summary.present + summary.late + summary.absent;
  const unchecked = summary.total - checked;
  const rate = checked > 0
    ? Math.round(((summary.present + summary.late) / checked) * 100 * 10) / 10
    : 0;

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[new Date().getDay()];

  return [
    '<b>📊 오늘의 출석 현황</b>',
    `<i>${today} (${dayName})</i>`,
    '',
    `✅ 출석: ${summary.present}명`,
    `⏰ 지각: ${summary.late}명`,
    `❌ 결석: ${summary.absent}명`,
    ...(unchecked > 0 ? [`⬜ 미체크: ${unchecked}명`] : []),
    '',
    `<b>출석률: ${rate}%</b> (${summary.present + summary.late}/${checked}명)`,
  ].join('\n');
}

// ─── 달란트 조회 ───

export async function handleTalentQuery(args: string[], context: CommandContext): Promise<string> {
  if (args.length === 0) {
    return '사용법: <code>/달란트 {학생이름}</code>\n예: <code>/달란트 홍길동</code>';
  }

  const name = args[0];
  const className = args.length > 1 ? args[1] : undefined;
  const student = await resolveStudent(name, className);

  if (typeof student === 'string') return student; // 에러 메시지

  // 최근 달란트 내역
  const history = await getTalentHistory(5, student.id);

  const lines = [
    '<b>💰 달란트 조회</b>',
    '',
    `👤 <b>${student.name}</b> (${student.grade}학년${student.className ? ', ' + student.className : ''})`,
    `잔액: <b>${student.talentBalance} 달란트</b>`,
  ];

  if (history.length > 0) {
    lines.push('', '<b>최근 내역</b>');
    for (const t of history) {
      const sign = t.amount >= 0 ? '+' : '';
      const date = t.createdAt.substring(5, 10).replace('-', '/');
      lines.push(`${sign}${t.amount} ${t.reason} (${date})`);
    }
  }

  return lines.join('\n');
}

// ─── 달란트 지급 ───

export async function handleGiveTalent(args: string[], context: CommandContext): Promise<string> {
  // /지급 이름 금액 사유
  // /지급 이름 반이름 금액 사유
  if (args.length < 3) {
    return '사용법: <code>/지급 {이름} {금액} {사유}</code>\n예: <code>/지급 홍길동 10 성경읽기</code>';
  }

  const { name, className, amount, reason } = parseTalentArgs(args);
  if (amount === null || amount <= 0) {
    return '❌ 금액은 양수 숫자로 입력해주세요.\n예: <code>/지급 홍길동 10 성경읽기</code>';
  }
  if (!reason) {
    return '❌ 사유를 입력해주세요.\n예: <code>/지급 홍길동 10 성경읽기</code>';
  }

  const student = await resolveStudent(name, className);
  if (typeof student === 'string') return student;

  await updateStudentTalentBalance(student.id, amount);
  await createTalentRecord({
    id: `talent-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    studentId: student.id,
    amount,
    reason,
    type: 'bonus',
  });

  const newBalance = student.talentBalance + amount;
  return [
    '✅ <b>달란트 지급 완료</b>',
    '',
    `👤 ${student.name} (${student.className || student.grade + '학년'})`,
    `💰 +${amount} 달란트`,
    `📝 사유: ${reason}`,
    `잔액: ${student.talentBalance} → <b>${newBalance} 달란트</b>`,
  ].join('\n');
}

// ─── 달란트 차감 (admin 전용) ───

export async function handleDeductTalent(args: string[], context: CommandContext): Promise<string> {
  if (args.length < 3) {
    return '사용법: <code>/차감 {이름} {금액} {사유}</code>\n예: <code>/차감 홍길동 5 규칙위반</code>';
  }

  const { name, className, amount, reason } = parseTalentArgs(args);
  if (amount === null || amount <= 0) {
    return '❌ 금액은 양수 숫자로 입력해주세요.\n예: <code>/차감 홍길동 5 규칙위반</code>';
  }
  if (!reason) {
    return '❌ 사유를 입력해주세요.\n예: <code>/차감 홍길동 5 규칙위반</code>';
  }

  const student = await resolveStudent(name, className);
  if (typeof student === 'string') return student;

  await updateStudentTalentBalance(student.id, -amount);
  await createTalentRecord({
    id: `talent-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    studentId: student.id,
    amount: -amount,
    reason,
    type: 'bonus',
  });

  const newBalance = student.talentBalance - amount;
  return [
    '✅ <b>달란트 차감 완료</b>',
    '',
    `👤 ${student.name} (${student.className || student.grade + '학년'})`,
    `💰 -${amount} 달란트`,
    `📝 사유: ${reason}`,
    `잔액: ${student.talentBalance} → <b>${newBalance} 달란트</b>`,
  ].join('\n');
}

// ─── 학생 목록 ───

export async function handleStudents(args: string[], context: CommandContext): Promise<string> {
  let classId: string | undefined;
  let filterClassName: string | undefined;

  if (args.length > 0) {
    filterClassName = args[0];
    const classes = await getAllClasses();
    const matched = classes.find(c => c.name.includes(filterClassName!));
    if (!matched) {
      return `❌ "${filterClassName}" 반을 찾을 수 없습니다.\n\n사용 가능한 반:\n${classes.map(c => `• ${c.name}`).join('\n')}`;
    }
    classId = matched.id;
    filterClassName = matched.name;
  }

  const students = await getAllStudents(classId);
  if (students.length === 0) {
    return filterClassName
      ? `"${filterClassName}"에 등록된 학생이 없습니다.`
      : '등록된 학생이 없습니다.';
  }

  const title = filterClassName
    ? `<b>👥 ${filterClassName} 학생 목록</b>`
    : '<b>👥 전체 학생 목록</b>';

  const lines = [title, `총 ${students.length}명`, ''];

  // 반별 그룹핑
  const byClass = new Map<string, typeof students>();
  for (const s of students) {
    const key = s.className || '미배정';
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key)!.push(s);
  }

  for (const [cls, studs] of byClass) {
    if (!filterClassName) lines.push(`<b>📌 ${cls}</b>`);
    for (const s of studs) {
      lines.push(`• ${s.name} (${s.grade}학년) 💰${s.talentBalance}`);
    }
    if (!filterClassName) lines.push('');
  }

  return lines.join('\n');
}

// ─── 요약 ───

export async function handleSummary(context: CommandContext): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const [summary, studentCount, totalTalent, topStudents] = await Promise.all([
    getAttendanceSummaryByDate(today),
    getStudentCount(),
    getTotalTalent(),
    getTopStudentsByTalent(3),
  ]);

  const checked = summary.present + summary.late + summary.absent;
  const rate = checked > 0
    ? Math.round(((summary.present + summary.late) / checked) * 100 * 10) / 10
    : 0;

  return [
    `<b>📊 오늘의 요약</b> (${today})`,
    '',
    '<b>출석</b>',
    `✅ ${summary.present}명  ⏰ ${summary.late}명  ❌ ${summary.absent}명`,
    `출석률: ${rate}%`,
    '',
    '<b>달란트</b>',
    `전체 학생: ${studentCount}명`,
    `총 유통 달란트: ${totalTalent}`,
    '',
    '<b>🏆 달란트 TOP 3</b>',
    ...topStudents.map((s, i) => `${i + 1}. ${s.name} — ${s.talentBalance} 달란트`),
  ].join('\n');
}

// ─── 랭킹 ───

export async function handleRanking(context: CommandContext): Promise<string> {
  const topStudents = await getTopStudentsByTalent(10);
  if (topStudents.length === 0) {
    return '등록된 학생이 없습니다.';
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = ['<b>🏆 달란트 랭킹 TOP 10</b>', ''];
  for (let i = 0; i < topStudents.length; i++) {
    const s = topStudents[i];
    const prefix = i < 3 ? medals[i] : `${i + 1}.`;
    lines.push(`${prefix} <b>${s.name}</b> (${s.grade}학년) — ${s.talentBalance} 달란트`);
  }

  return lines.join('\n');
}

// ─── 공지사항 등록 (admin) ───

export async function handleAnnounce(
  args: string[], rawText: string, context: CommandContext
): Promise<string> {
  // /공지 제목\n내용 또는 /공지 제목 (내용은 줄바꿈 후)
  if (args.length === 0) {
    return '사용법: <code>/공지 제목</code>\n(줄바꿈 후 내용 입력)\n\n예:\n<code>/공지 이번주 안내\n수련회 준비물을 챙겨주세요.</code>';
  }

  // rawText에서 /공지 제거 후 제목과 내용 분리
  const textAfterCmd = rawText.replace(/^\/공지\s*/, '').replace(/^\/announce\s*/i, '');
  const newlineIdx = textAfterCmd.indexOf('\n');

  let title: string;
  let content: string;

  if (newlineIdx > 0) {
    title = textAfterCmd.substring(0, newlineIdx).trim();
    content = textAfterCmd.substring(newlineIdx + 1).trim();
  } else {
    title = textAfterCmd.trim();
    content = '';
  }

  if (!title) {
    return '❌ 제목을 입력해주세요.';
  }
  if (!content) {
    content = title; // 제목만 있으면 내용도 같은 값
  }

  await createAnnouncement({
    id: `ann-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    title,
    content,
    category: 'general',
    isPinned: false,
    authorId: context.userId!,
  });

  return [
    '✅ <b>공지사항 등록 완료</b>',
    '',
    `📢 <b>${escapeHtml(title)}</b>`,
    escapeHtml(content.substring(0, 100)) + (content.length > 100 ? '...' : ''),
  ].join('\n');
}

// ─── 연결 해제 ───

export async function handleUnlink(context: CommandContext): Promise<string> {
  await deleteTelegramLinkByChatId(context.chatId);
  return [
    '✅ <b>연결이 해제되었습니다</b>',
    '',
    '다시 연결하려면 <code>/start</code> 로 시작하세요.',
  ].join('\n');
}

// ─── 헬퍼 함수 ───

async function resolveStudent(
  name: string, className?: string
): Promise<{ id: string; name: string; grade: number; className: string | null; talentBalance: number } | string> {
  let students = await findStudentsByName(name);

  if (students.length === 0) {
    return `❌ "<b>${escapeHtml(name)}</b>"와 일치하는 학생이 없습니다.\n/학생 명령으로 학생 목록을 확인하세요.`;
  }

  if (className) {
    const filtered = students.filter(s => s.className?.includes(className));
    if (filtered.length === 1) return filtered[0];
    if (filtered.length === 0) {
      return `❌ "${className}"에 "${name}" 학생이 없습니다.`;
    }
    students = filtered;
  }

  if (students.length === 1) return students[0];

  // 동명이인
  const list = students.map((s, i) =>
    `${i + 1}. ${s.name} (${s.grade}학년${s.className ? ', ' + s.className : ''})`
  ).join('\n');

  return [
    `⚠️ <b>동명이인이 있습니다</b>`,
    '',
    `"${escapeHtml(name)}" 검색 결과:`,
    list,
    '',
    '반 이름을 포함해서 입력해주세요:',
    `<code>/달란트 ${name} {반이름}</code>`,
  ].join('\n');
}

function parseTalentArgs(args: string[]): {
  name: string;
  className: string | undefined;
  amount: number | null;
  reason: string;
} {
  // /지급 이름 금액 사유
  // /지급 이름 반이름 금액 사유
  const name = args[0];

  // 두 번째 인수가 숫자인지 확인
  const secondIsNumber = !isNaN(Number(args[1]));

  if (secondIsNumber) {
    return {
      name,
      className: undefined,
      amount: parseInt(args[1], 10),
      reason: args.slice(2).join(' '),
    };
  } else {
    // 두 번째는 반이름, 세 번째가 금액
    return {
      name,
      className: args[1],
      amount: args.length > 2 ? parseInt(args[2], 10) : null,
      reason: args.slice(3).join(' '),
    };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
