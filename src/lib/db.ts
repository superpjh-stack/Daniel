import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

function createPrismaClient() {
  const isRds = process.env.DATABASE_URL?.includes('.rds.amazonaws.com');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL!,
    ...(isRds ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ─── 인터페이스 ───

export interface User {
  id: string;
  loginId: string;
  password: string;
  name: string;
  role: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  name: string;
  grade: number;
  birthday: string | null;
  parentPhone: string | null;
  parentName: string | null;
  note: string | null;
  talentBalance: number;
  classId: string | null;
  className?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  id: string;
  name: string;
  grade: number;
  teacherId: string | null;
  teacherName?: string | null;
  studentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Talent {
  id: string;
  studentId: string;
  amount: number;
  reason: string;
  type: string;
  createdAt: string;
  studentName?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image: string | null;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParentStudent {
  id: string;
  parentId: string;
  studentId: string;
  parentName?: string;
  studentName?: string;
  createdAt: string;
}

export interface ParentWithChildren {
  id: string;
  loginId: string;
  name: string;
  phone: string | null;
  children: { id: string; name: string; grade: number; className: string | null }[];
}

export interface StudentSummary {
  id: string;
  name: string;
  grade: number;
  talentBalance: number;
  profileImage: string | null;
  className: string | null;
}

// ─── 헬퍼 ───

function toISOString(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function toDateString(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().split('T')[0];
}

// ─── User 함수 (6개) ───

export async function getUserByLoginId(loginId: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user) return undefined;
  return {
    ...user,
    phone: user.phone ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function getUserById(id: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return undefined;
  return {
    ...user,
    phone: user.phone ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function updateUser(id: string, data: { loginId?: string; password?: string; name?: string; role?: string; phone?: string }): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: {
      ...(data.loginId !== undefined && { loginId: data.loginId }),
      ...(data.password !== undefined && { password: data.password }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.phone !== undefined && { phone: data.phone }),
    },
  });
}

export async function getAllUsers(): Promise<User[]> {
  const users = await prisma.user.findMany({
    select: { id: true, loginId: true, name: true, role: true, phone: true, createdAt: true, updatedAt: true, password: true },
    orderBy: { createdAt: 'desc' },
  });
  return users.map(u => ({
    ...u,
    phone: u.phone ?? null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));
}

export async function createUser(user: { id: string; loginId: string; password: string; name: string; role: string; phone?: string }): Promise<void> {
  await prisma.user.create({
    data: {
      id: user.id,
      loginId: user.loginId,
      password: user.password,
      name: user.name,
      role: user.role,
      phone: user.phone || null,
    },
  });
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

// ─── Student 함수 (11개) ───

export async function getAllStudents(classId?: string): Promise<Student[]> {
  const where = classId && classId !== 'all' ? { classId } : {};
  const students = await prisma.student.findMany({
    where,
    include: { class: { select: { name: true } } },
    orderBy: [{ grade: 'asc' }, { name: 'asc' }],
  });
  return students.map(s => ({
    id: s.id,
    name: s.name,
    grade: s.grade,
    birthday: toDateString(s.birthday),
    parentPhone: s.parentPhone,
    parentName: s.parentName,
    note: s.note,
    talentBalance: s.talentBalance,
    classId: s.classId,
    className: s.class?.name ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  const s = await prisma.student.findUnique({
    where: { id },
    include: { class: { select: { name: true } } },
  });
  if (!s) return undefined;
  return {
    id: s.id,
    name: s.name,
    grade: s.grade,
    birthday: toDateString(s.birthday),
    parentPhone: s.parentPhone,
    parentName: s.parentName,
    note: s.note,
    talentBalance: s.talentBalance,
    classId: s.classId,
    className: s.class?.name ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function createStudent(student: { id: string; name: string; grade: number; birthday?: string; parentPhone?: string; parentName?: string; note?: string; classId?: string; profileImage?: string }): Promise<void> {
  await prisma.student.create({
    data: {
      id: student.id,
      name: student.name,
      grade: student.grade,
      birthday: student.birthday ? new Date(student.birthday) : null,
      parentPhone: student.parentPhone || null,
      parentName: student.parentName || null,
      note: student.note || null,
      talentBalance: 0,
      classId: student.classId || null,
      profileImage: student.profileImage || null,
    },
  });
}

export async function updateStudent(id: string, student: { name?: string; grade?: number; birthday?: string; parentPhone?: string; parentName?: string; note?: string; classId?: string; profileImage?: string }): Promise<void> {
  const data: Record<string, unknown> = {};
  if (student.name !== undefined) data.name = student.name;
  if (student.grade !== undefined) data.grade = student.grade;
  if (student.birthday !== undefined) data.birthday = student.birthday ? new Date(student.birthday) : null;
  if (student.parentPhone !== undefined) data.parentPhone = student.parentPhone || null;
  if (student.parentName !== undefined) data.parentName = student.parentName || null;
  if (student.note !== undefined) data.note = student.note || null;
  if (student.classId !== undefined) data.classId = student.classId || null;
  if (student.profileImage !== undefined) data.profileImage = student.profileImage || null;
  await prisma.student.update({ where: { id }, data });
}

export async function deleteStudent(id: string): Promise<void> {
  // Cascade는 Prisma 스키마에 onDelete: Cascade가 설정되어 있으므로
  // Attendance, Talent은 자동 삭제됨. ParentStudent도 Cascade.
  await prisma.student.delete({ where: { id } });
}

export async function updateStudentTalentBalance(id: string, amount: number): Promise<void> {
  await prisma.student.update({
    where: { id },
    data: { talentBalance: { increment: amount } },
  });
}

export async function getAllStudentsWithAttendance(classId?: string): Promise<(Student & { profileImage: string | null; recentAttendance: { date: string; status: string }[] })[]> {
  const where = classId && classId !== 'all' ? { classId } : {};
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const students = await prisma.student.findMany({
    where,
    include: {
      class: { select: { name: true } },
      attendances: {
        where: { date: { gte: fourWeeksAgo } },
        orderBy: { date: 'desc' },
        take: 4,
        select: { date: true, status: true },
      },
    },
    orderBy: [{ grade: 'asc' }, { name: 'asc' }],
  });

  return students.map(s => ({
    id: s.id,
    name: s.name,
    grade: s.grade,
    birthday: toDateString(s.birthday),
    parentPhone: s.parentPhone,
    parentName: s.parentName,
    note: s.note,
    talentBalance: s.talentBalance,
    classId: s.classId,
    className: s.class?.name ?? null,
    profileImage: s.profileImage,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    recentAttendance: s.attendances.map(a => ({
      date: toDateString(a.date)!,
      status: a.status,
    })),
  }));
}

export async function getStudentDetail(id: string): Promise<(Student & {
  profileImage: string | null;
  attendanceStats: { totalPresent: number; totalLate: number; totalAbsent: number };
  attendanceStreak: number;
  recentAttendance: { date: string; status: string; memo: string | null }[];
  recentTalents: { amount: number; reason: string; type: string; createdAt: string }[];
}) | undefined> {
  const s = await prisma.student.findUnique({
    where: { id },
    include: { class: { select: { name: true } } },
  });
  if (!s) return undefined;

  // 출석 통계
  const [presentCount, lateCount, absentCount] = await Promise.all([
    prisma.attendance.count({ where: { studentId: id, status: 'present' } }),
    prisma.attendance.count({ where: { studentId: id, status: 'late' } }),
    prisma.attendance.count({ where: { studentId: id, status: 'absent' } }),
  ]);

  // 연속 출석
  const allAttendance = await prisma.attendance.findMany({
    where: { studentId: id },
    orderBy: { date: 'desc' },
    select: { status: true },
  });
  let streak = 0;
  for (const row of allAttendance) {
    if (row.status === 'present' || row.status === 'late') streak++;
    else break;
  }

  // 최근 출석 10건
  const recentAttendance = await prisma.attendance.findMany({
    where: { studentId: id },
    orderBy: { date: 'desc' },
    take: 10,
    select: { date: true, status: true, memo: true },
  });

  // 최근 달란트 10건
  const recentTalents = await prisma.talent.findMany({
    where: { studentId: id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { amount: true, reason: true, type: true, createdAt: true },
  });

  return {
    id: s.id,
    name: s.name,
    grade: s.grade,
    birthday: toDateString(s.birthday),
    parentPhone: s.parentPhone,
    parentName: s.parentName,
    note: s.note,
    talentBalance: s.talentBalance,
    classId: s.classId,
    className: s.class?.name ?? null,
    profileImage: s.profileImage,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    attendanceStats: {
      totalPresent: presentCount,
      totalLate: lateCount,
      totalAbsent: absentCount,
    },
    attendanceStreak: streak,
    recentAttendance: recentAttendance.map(a => ({
      date: toDateString(a.date)!,
      status: a.status,
      memo: a.memo,
    })),
    recentTalents: recentTalents.map(t => ({
      amount: t.amount,
      reason: t.reason,
      type: t.type,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

export async function checkDuplicateStudent(name: string, grade: number, excludeId?: string): Promise<{ exists: boolean; count: number }> {
  const where: Record<string, unknown> = { name, grade };
  if (excludeId) where.id = { not: excludeId };
  const count = await prisma.student.count({ where });
  return { exists: count > 0, count };
}

export async function getStudentStats(): Promise<{ total: number; byGrade: { grade: number; count: number }[]; assignedToClass: number }> {
  const [total, assignedToClass, byGradeRaw] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { classId: { not: null } } }),
    prisma.student.groupBy({
      by: ['grade'],
      _count: { id: true },
      orderBy: { grade: 'asc' },
    }),
  ]);
  return {
    total,
    byGrade: byGradeRaw.map(g => ({ grade: g.grade, count: g._count.id })),
    assignedToClass,
  };
}

// ─── Class 함수 (3개) ───

export async function getAllClasses(): Promise<Class[]> {
  const classes = await prisma.class.findMany({
    include: {
      teacher: { select: { name: true } },
      _count: { select: { students: true } },
    },
    orderBy: [{ grade: 'asc' }, { name: 'asc' }],
  });
  return classes.map(c => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    teacherId: c.teacherId,
    teacherName: c.teacher?.name ?? null,
    studentCount: c._count.students,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

export async function createClass(cls: { id: string; name: string; grade: number; teacherId?: string }): Promise<void> {
  await prisma.class.create({
    data: {
      id: cls.id,
      name: cls.name,
      grade: cls.grade,
      teacherId: cls.teacherId || null,
    },
  });
}

export async function updateClass(id: string, data: { name?: string; grade?: number; teacherId?: string | null }): Promise<void> {
  await prisma.class.update({ where: { id }, data });
}

export async function deleteClass(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.student.updateMany({ where: { classId: id }, data: { classId: null } }),
    prisma.class.delete({ where: { id } }),
  ]);
}

// ─── Attendance 함수 (8개) ───

export async function getAttendanceByDate(date: string, classId?: string): Promise<{ studentId: string; status: string; memo: string | null }[]> {
  const dateObj = new Date(date + 'T00:00:00.000Z');
  const nextDay = new Date(dateObj);
  nextDay.setDate(nextDay.getDate() + 1);

  const where: Record<string, unknown> = {
    date: { gte: dateObj, lt: nextDay },
  };
  if (classId && classId !== 'all') {
    where.student = { classId };
  }

  const records = await prisma.attendance.findMany({
    where,
    select: { studentId: true, status: true, memo: true },
  });
  return records;
}

export async function upsertAttendance(studentId: string, date: string, status: string, memo?: string): Promise<void> {
  const dateObj = new Date(date + 'T00:00:00.000Z');

  await prisma.attendance.upsert({
    where: { studentId_date: { studentId, date: dateObj } },
    update: { status, memo: memo || null },
    create: {
      studentId,
      date: dateObj,
      status,
      memo: memo || null,
    },
  });
}

export async function getTodayAttendanceCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.attendance.count({
    where: {
      date: { gte: today, lt: tomorrow },
      status: { in: ['present', 'late'] },
    },
  });
}

export async function getRecentAttendance(limit: number = 5): Promise<{ id: string; name: string; status: string; time: string }[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const records = await prisma.attendance.findMany({
    where: { date: { gte: today, lt: tomorrow } },
    include: { student: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return records.map(a => ({
    id: a.id,
    name: a.student.name,
    status: a.status,
    time: a.createdAt.toISOString().substring(11, 16),
  }));
}

export async function getStudentAttendanceHistory(studentId: string, limit: number = 20): Promise<{ date: string; status: string; memo: string | null; createdAt: string }[]> {
  const records = await prisma.attendance.findMany({
    where: { studentId },
    orderBy: { date: 'desc' },
    take: limit,
    select: { date: true, status: true, memo: true, createdAt: true },
  });
  return records.map(a => ({
    date: toDateString(a.date)!,
    status: a.status,
    memo: a.memo,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function getStudentAttendanceStreak(studentId: string): Promise<number> {
  const rows = await prisma.attendance.findMany({
    where: { studentId },
    orderBy: { date: 'desc' },
    select: { status: true },
  });
  let streak = 0;
  for (const row of rows) {
    if (row.status === 'present' || row.status === 'late') streak++;
    else break;
  }
  return streak;
}

export async function getAttendanceSummaryByDate(date: string, classId?: string): Promise<{ total: number; present: number; late: number; absent: number }> {
  const studentWhere = classId && classId !== 'all' ? { classId } : {};
  const studentCount = await prisma.student.count({ where: studentWhere });

  const dateObj = new Date(date + 'T00:00:00.000Z');
  const nextDay = new Date(dateObj);
  nextDay.setDate(nextDay.getDate() + 1);

  const attendanceWhere: Record<string, unknown> = {
    date: { gte: dateObj, lt: nextDay },
  };
  if (classId && classId !== 'all') {
    attendanceWhere.student = { classId };
  }

  const [present, late, absent] = await Promise.all([
    prisma.attendance.count({ where: { ...attendanceWhere, status: 'present' } }),
    prisma.attendance.count({ where: { ...attendanceWhere, status: 'late' } }),
    prisma.attendance.count({ where: { ...attendanceWhere, status: 'absent' } }),
  ]);

  return { total: studentCount, present, late, absent };
}

export async function getStudentAttendanceStats(studentId: string): Promise<{ totalPresent: number; totalLate: number; totalAbsent: number }> {
  const [totalPresent, totalLate, totalAbsent] = await Promise.all([
    prisma.attendance.count({ where: { studentId, status: 'present' } }),
    prisma.attendance.count({ where: { studentId, status: 'late' } }),
    prisma.attendance.count({ where: { studentId, status: 'absent' } }),
  ]);
  return { totalPresent, totalLate, totalAbsent };
}

// ─── Talent 함수 (6개) ───

export async function createTalentRecord(record: { id: string; studentId: string; amount: number; reason: string; type: string }): Promise<void> {
  await prisma.talent.create({
    data: {
      id: record.id,
      studentId: record.studentId,
      amount: record.amount,
      reason: record.reason,
      type: record.type,
    },
  });
}

export async function getTalentHistory(limit: number = 20, studentId?: string): Promise<Talent[]> {
  const where = studentId ? { studentId } : {};
  const records = await prisma.talent.findMany({
    where,
    include: { student: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return records.map(t => ({
    id: t.id,
    studentId: t.studentId,
    amount: t.amount,
    reason: t.reason,
    type: t.type,
    createdAt: t.createdAt.toISOString(),
    studentName: t.student.name,
  }));
}

export async function getTotalTalent(): Promise<number> {
  const result = await prisma.student.aggregate({ _sum: { talentBalance: true } });
  return result._sum.talentBalance || 0;
}

export async function getTopStudentsByTalent(limit: number = 5): Promise<{ id: string; name: string; grade: number; talentBalance: number }[]> {
  const students = await prisma.student.findMany({
    orderBy: { talentBalance: 'desc' },
    take: limit,
    select: { id: true, name: true, grade: true, talentBalance: true },
  });
  return students;
}

// ─── Product/Shop 함수 (7개) ───

export async function getAllProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  return products.map(p => ({
    ...p,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) return undefined;
  return {
    ...p,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function createProduct(product: { id: string; name: string; description?: string; price: number; stock: number; image?: string; category?: string }): Promise<void> {
  await prisma.product.create({
    data: {
      id: product.id,
      name: product.name,
      description: product.description || null,
      price: product.price,
      stock: product.stock,
      image: product.image || null,
      category: product.category || null,
      isActive: true,
    },
  });
}

export async function updateProductStock(id: string, amount: number): Promise<void> {
  await prisma.product.update({
    where: { id },
    data: { stock: { increment: amount } },
  });
}

export async function updateProduct(id: string, data: { name: string; description?: string; price: number; stock: number; image?: string; category?: string }): Promise<void> {
  await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      price: data.price,
      stock: data.stock,
      image: data.image || null,
      category: data.category || null,
    },
  });
}

export async function deactivateProduct(id: string): Promise<void> {
  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function executePurchaseTransaction(
  productId: string, studentId: string, quantity: number
): Promise<{ remainingBalance: number; remainingStock: number }> {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({ where: { id: productId, isActive: true } });
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    if (product.stock < quantity) throw new Error('STOCK_INSUFFICIENT');

    const student = await tx.student.findUnique({ where: { id: studentId } });
    if (!student) throw new Error('STUDENT_NOT_FOUND');

    const totalPrice = product.price * quantity;
    if (student.talentBalance < totalPrice) throw new Error('BALANCE_INSUFFICIENT');

    await tx.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    });

    await tx.student.update({
      where: { id: studentId },
      data: { talentBalance: { decrement: totalPrice } },
    });

    await tx.talent.create({
      data: {
        studentId,
        amount: -totalPrice,
        reason: `${product.name} ${quantity}개 구매`,
        type: 'purchase',
      },
    });

    return {
      remainingBalance: student.talentBalance - totalPrice,
      remainingStock: product.stock - quantity,
    };
  });
}

export async function getStudentPurchaseHistory(studentId: string, limit: number = 20): Promise<{
  purchases: { id: string; amount: number; reason: string; createdAt: string }[];
  totalSpent: number;
  purchaseCount: number;
}> {
  const [purchases, stats] = await Promise.all([
    prisma.talent.findMany({
      where: { studentId, type: 'purchase' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, amount: true, reason: true, createdAt: true },
    }),
    prisma.talent.aggregate({
      where: { studentId, type: 'purchase' },
      _count: { id: true },
      _sum: { amount: true },
    }),
  ]);

  return {
    purchases: purchases.map(p => ({
      id: p.id,
      amount: p.amount,
      reason: p.reason,
      createdAt: p.createdAt.toISOString(),
    })),
    totalSpent: Math.abs(stats._sum.amount || 0),
    purchaseCount: stats._count.id,
  };
}

export async function getProductPurchaseCount(productName: string): Promise<number> {
  return prisma.talent.count({
    where: {
      type: 'purchase',
      reason: { startsWith: productName },
    },
  });
}

// ─── 생일자 조회 ───

export async function getThisWeekBirthdays(): Promise<{ id: string; name: string; birthday: string; grade: number }[]> {
  // PostgreSQL에서는 날짜 비교를 JS에서 처리
  const students = await prisma.student.findMany({
    where: { birthday: { not: null } },
    select: { id: true, name: true, birthday: true, grade: true },
  });

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startMD = (startOfWeek.getMonth() + 1) * 100 + startOfWeek.getDate();
  const endMD = (endOfWeek.getMonth() + 1) * 100 + endOfWeek.getDate();

  return students
    .filter(s => {
      if (!s.birthday) return false;
      const md = (s.birthday.getMonth() + 1) * 100 + s.birthday.getDate();
      if (startMD <= endMD) {
        return md >= startMD && md <= endMD;
      }
      // 연말 교차 (12/29 ~ 1/4)
      return md >= startMD || md <= endMD;
    })
    .map(s => ({
      id: s.id,
      name: s.name,
      birthday: toDateString(s.birthday)!,
      grade: s.grade,
    }));
}

// ─── Settings 함수 (3개) ───

export async function getSettingValue(key: string, defaultValue: string): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? defaultValue;
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

// ─── Announcement 함수 (7개) ───

export async function getAllAnnouncements(
  category?: string,
  page: number = 1,
  limit: number = 10
): Promise<{ announcements: Announcement[]; total: number }> {
  const where = category ? { category } : {};

  const [total, announcements] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      include: { author: { select: { name: true } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    announcements: announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      category: a.category,
      isPinned: a.isPinned,
      authorId: a.authorId,
      authorName: a.author.name,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
    total,
  };
}

export async function getAnnouncementById(id: string): Promise<Announcement | undefined> {
  const a = await prisma.announcement.findUnique({
    where: { id },
    include: { author: { select: { name: true } } },
  });
  if (!a) return undefined;
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    category: a.category,
    isPinned: a.isPinned,
    authorId: a.authorId,
    authorName: a.author.name,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function createAnnouncement(announcement: {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  authorId: string;
}): Promise<void> {
  await prisma.announcement.create({
    data: {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      isPinned: announcement.isPinned,
      authorId: announcement.authorId,
    },
  });
}

export async function updateAnnouncement(id: string, data: {
  title?: string;
  content?: string;
  category?: string;
  isPinned?: boolean;
}): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
  if (Object.keys(updateData).length === 0) return;
  await prisma.announcement.update({ where: { id }, data: updateData });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await prisma.announcement.delete({ where: { id } });
}

export async function toggleAnnouncementPin(id: string, isPinned: boolean): Promise<void> {
  await prisma.announcement.update({ where: { id }, data: { isPinned } });
}

export async function getRecentAnnouncements(limit: number = 3): Promise<Announcement[]> {
  const announcements = await prisma.announcement.findMany({
    include: { author: { select: { name: true } } },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
  return announcements.map(a => ({
    id: a.id,
    title: a.title,
    content: a.content,
    category: a.category,
    isPinned: a.isPinned,
    authorId: a.authorId,
    authorName: a.author.name,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
}

// ─── Parent 함수 (8개) ───

export async function getParentList(): Promise<ParentWithChildren[]> {
  const parents = await prisma.user.findMany({
    where: { role: 'parent' },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      loginId: true,
      name: true,
      phone: true,
      parentStudents: {
        include: {
          student: {
            include: { class: { select: { name: true } } },
          },
        },
      },
    },
  });

  return parents.map(p => ({
    id: p.id,
    loginId: p.loginId,
    name: p.name,
    phone: p.phone,
    children: p.parentStudents.map(ps => ({
      id: ps.student.id,
      name: ps.student.name,
      grade: ps.student.grade,
      className: ps.student.class?.name ?? null,
    })),
  }));
}

export async function getParentById(id: string): Promise<ParentWithChildren | undefined> {
  const parent = await prisma.user.findFirst({
    where: { id, role: 'parent' },
    select: {
      id: true,
      loginId: true,
      name: true,
      phone: true,
      parentStudents: {
        include: {
          student: {
            include: { class: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!parent) return undefined;
  return {
    id: parent.id,
    loginId: parent.loginId,
    name: parent.name,
    phone: parent.phone,
    children: parent.parentStudents.map(ps => ({
      id: ps.student.id,
      name: ps.student.name,
      grade: ps.student.grade,
      className: ps.student.class?.name ?? null,
    })),
  };
}

export async function linkParentStudent(parentId: string, studentId: string): Promise<void> {
  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    update: {},
    create: { parentId, studentId },
  });
}

export async function unlinkAllParentStudents(parentId: string): Promise<void> {
  await prisma.parentStudent.deleteMany({ where: { parentId } });
}

export async function deleteParentAccount(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.parentStudent.deleteMany({ where: { parentId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);
}

export async function getChildrenByParentId(parentId: string): Promise<StudentSummary[]> {
  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    include: {
      student: {
        include: { class: { select: { name: true } } },
      },
    },
    orderBy: { student: { grade: 'asc' } },
  });
  return links.map(l => ({
    id: l.student.id,
    name: l.student.name,
    grade: l.student.grade,
    talentBalance: l.student.talentBalance,
    profileImage: l.student.profileImage,
    className: l.student.class?.name ?? null,
  }));
}

export async function isParentOfStudent(parentId: string, studentId: string): Promise<boolean> {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  return !!link;
}

export async function getParentDashboardData(parentId: string, studentId?: string): Promise<{
  student: StudentSummary;
  attendanceSummary: { totalPresent: number; totalLate: number; totalAbsent: number; streak: number };
  recentAttendance: { date: string; status: string }[];
  recentTalent: { amount: number; reason: string; type: string; createdAt: string }[];
} | null> {
  const children = await getChildrenByParentId(parentId);
  if (children.length === 0) return null;

  const targetId = studentId && children.some(c => c.id === studentId) ? studentId : children[0].id;
  const student = children.find(c => c.id === targetId)!;

  const [totalPresent, totalLate, totalAbsent] = await Promise.all([
    prisma.attendance.count({ where: { studentId: targetId, status: 'present' } }),
    prisma.attendance.count({ where: { studentId: targetId, status: 'late' } }),
    prisma.attendance.count({ where: { studentId: targetId, status: 'absent' } }),
  ]);

  // 연속 출석
  const allAtt = await prisma.attendance.findMany({
    where: { studentId: targetId },
    orderBy: { date: 'desc' },
    select: { status: true },
  });
  let streak = 0;
  for (const row of allAtt) {
    if (row.status === 'present' || row.status === 'late') streak++;
    else break;
  }

  const recentAttendance = await prisma.attendance.findMany({
    where: { studentId: targetId },
    orderBy: { date: 'desc' },
    take: 5,
    select: { date: true, status: true },
  });

  const recentTalent = await prisma.talent.findMany({
    where: { studentId: targetId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { amount: true, reason: true, type: true, createdAt: true },
  });

  return {
    student,
    attendanceSummary: { totalPresent, totalLate, totalAbsent, streak },
    recentAttendance: recentAttendance.map(a => ({
      date: toDateString(a.date)!,
      status: a.status,
    })),
    recentTalent: recentTalent.map(t => ({
      amount: t.amount,
      reason: t.reason,
      type: t.type,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

// ─── 통계 ───

export async function getStudentCount(): Promise<number> {
  return prisma.student.count();
}

// ─── Stats 페이지용 함수 ───

export async function getWeeklyAttendanceStats(): Promise<{ week: string; present: number; late: number; absent: number }[]> {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const records = await prisma.attendance.findMany({
    where: { date: { gte: fourWeeksAgo } },
    select: { date: true, status: true },
    orderBy: { date: 'asc' },
  });

  // 주별로 그룹핑
  const weekMap = new Map<string, { present: number; late: number; absent: number }>();
  for (const r of records) {
    const d = r.date;
    // 해당 주의 월요일을 기준으로 그룹핑
    const weekStart = new Date(d);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    const weekKey = `${String(weekStart.getMonth() + 1).padStart(2, '0')}/${String(weekStart.getDate()).padStart(2, '0')}`;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { present: 0, late: 0, absent: 0 });
    }
    const stats = weekMap.get(weekKey)!;
    if (r.status === 'present') stats.present++;
    else if (r.status === 'late') stats.late++;
    else if (r.status === 'absent') stats.absent++;
  }

  const result = Array.from(weekMap.entries()).map(([week, stats]) => ({
    week,
    ...stats,
  }));

  return result.length > 0 ? result.slice(-4) : [
    { week: '1주', present: 0, late: 0, absent: 0 },
    { week: '2주', present: 0, late: 0, absent: 0 },
    { week: '3주', present: 0, late: 0, absent: 0 },
    { week: '4주', present: 0, late: 0, absent: 0 },
  ];
}

export async function getAttendanceRanking(limit: number = 10): Promise<{ id: string; name: string; grade: number; attendanceRate: number; totalPresent: number }[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const students = await prisma.student.findMany({
    include: {
      attendances: {
        where: { date: { gte: thirtyDaysAgo } },
        select: { status: true },
      },
    },
  });

  return students
    .map(s => {
      const total = s.attendances.length;
      const presentCount = s.attendances.filter(a => a.status === 'present' || a.status === 'late').length;
      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        attendanceRate: total > 0 ? Math.round((presentCount / total) * 100) : 0,
        totalPresent: presentCount,
      };
    })
    .sort((a, b) => b.totalPresent - a.totalPresent)
    .slice(0, limit);
}

// ─── Quiz 함수 ───

export interface QuizQuestion {
  id: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  answer: number;
  category: string;
  difficulty: string;
  reference: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizResult {
  id: string;
  studentId: string;
  score: number;
  totalCount: number;
  earnedTalent: number;
  answers: string;
  createdAt: string;
  studentName?: string;
}

export async function getAllQuizQuestions(
  category?: string,
  difficulty?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ questions: QuizQuestion[]; total: number }> {
  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== 'all') where.category = category;
  if (difficulty && difficulty !== 'all') where.difficulty = difficulty;

  const [total, questions] = await Promise.all([
    prisma.quizQuestion.count({ where }),
    prisma.quizQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    questions: questions.map(q => ({
      ...q,
      reference: q.reference ?? null,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    })),
    total,
  };
}

export async function getQuizQuestionById(id: string): Promise<QuizQuestion | undefined> {
  const q = await prisma.quizQuestion.findUnique({ where: { id } });
  if (!q) return undefined;
  return {
    ...q,
    reference: q.reference ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

export async function createQuizQuestion(data: {
  question: string; option1: string; option2: string; option3: string; option4: string;
  answer: number; category: string; difficulty?: string; reference?: string;
}): Promise<string> {
  const q = await prisma.quizQuestion.create({
    data: {
      question: data.question,
      option1: data.option1,
      option2: data.option2,
      option3: data.option3,
      option4: data.option4,
      answer: data.answer,
      category: data.category,
      difficulty: data.difficulty || 'easy',
      reference: data.reference || null,
    },
  });
  return q.id;
}

export async function updateQuizQuestion(id: string, data: {
  question?: string; option1?: string; option2?: string; option3?: string; option4?: string;
  answer?: number; category?: string; difficulty?: string; reference?: string;
}): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (data.question !== undefined) updateData.question = data.question;
  if (data.option1 !== undefined) updateData.option1 = data.option1;
  if (data.option2 !== undefined) updateData.option2 = data.option2;
  if (data.option3 !== undefined) updateData.option3 = data.option3;
  if (data.option4 !== undefined) updateData.option4 = data.option4;
  if (data.answer !== undefined) updateData.answer = data.answer;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
  if (data.reference !== undefined) updateData.reference = data.reference || null;
  await prisma.quizQuestion.update({ where: { id }, data: updateData });
}

export async function deactivateQuizQuestion(id: string): Promise<void> {
  await prisma.quizQuestion.update({ where: { id }, data: { isActive: false } });
}

export async function getRandomQuizQuestions(
  category?: string,
  difficulty?: string,
  count: number = 10
): Promise<Omit<QuizQuestion, 'answer' | 'isActive' | 'createdAt' | 'updatedAt'>[]> {
  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== 'all') where.category = category;
  if (difficulty && difficulty !== 'all') where.difficulty = difficulty;

  // 전체 조회 후 셔플 (PostgreSQL RANDOM() 대신 JS 셔플)
  const all = await prisma.quizQuestion.findMany({
    where,
    select: { id: true, question: true, option1: true, option2: true, option3: true, option4: true, category: true, difficulty: true, reference: true },
  });

  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.slice(0, count).map(q => ({
    ...q,
    reference: q.reference ?? null,
  }));
}

export async function getStudentTodayQuizCount(studentId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.quizResult.count({
    where: {
      studentId,
      createdAt: { gte: today, lt: tomorrow },
    },
  });
}

export async function submitQuizAndAwardTalent(
  studentId: string,
  answers: { questionId: string; selected: number }[]
): Promise<{
  score: number;
  totalCount: number;
  earnedTalent: number;
  talentAwarded: boolean;
  newBalance: number;
  details: { questionId: string; question: string; selected: number; correct: number; isCorrect: boolean; reference: string | null; correctOption?: string }[];
}> {
  return prisma.$transaction(async (tx) => {
    const questionIds = answers.map(a => a.questionId);
    const questions = await tx.quizQuestion.findMany({
      where: { id: { in: questionIds } },
    });
    const questionMap = new Map(questions.map(q => [q.id, q]));

    let score = 0;
    const details = answers.map(a => {
      const q = questionMap.get(a.questionId);
      if (!q) return { questionId: a.questionId, question: '?', selected: a.selected, correct: 0, isCorrect: false, reference: null };
      const isCorrect = a.selected === q.answer;
      if (isCorrect) score++;
      const optionKey = `option${q.answer}` as 'option1' | 'option2' | 'option3' | 'option4';
      return {
        questionId: a.questionId,
        question: q.question,
        selected: a.selected,
        correct: q.answer,
        isCorrect,
        reference: q.reference,
        ...(!isCorrect && { correctOption: q[optionKey] }),
      };
    });

    const totalCount = answers.length;
    let earnedTalent = 0;
    if (score === 10) earnedTalent = 10;
    else if (score >= 7) earnedTalent = 7;
    else if (score >= 4) earnedTalent = 4;
    else if (score >= 1) earnedTalent = 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayCount = await tx.quizResult.count({
      where: { studentId, createdAt: { gte: today, lt: tomorrow } },
    });
    const talentAwarded = todayCount < 3 && earnedTalent > 0;
    const actualTalent = talentAwarded ? earnedTalent : 0;

    await tx.quizResult.create({
      data: {
        studentId,
        score,
        totalCount,
        earnedTalent: actualTalent,
        answers: JSON.stringify(details),
      },
    });

    let newBalance = 0;
    if (talentAwarded) {
      await tx.talent.create({
        data: {
          studentId,
          amount: actualTalent,
          reason: `성경퀴즈 ${score}/${totalCount} (${actualTalent}달란트)`,
          type: 'quiz',
        },
      });
      const student = await tx.student.update({
        where: { id: studentId },
        data: { talentBalance: { increment: actualTalent } },
      });
      newBalance = student.talentBalance;
    } else {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      newBalance = student?.talentBalance ?? 0;
    }

    return { score, totalCount, earnedTalent: actualTalent, talentAwarded, newBalance, details };
  });
}

export async function getQuizResults(
  studentId?: string,
  classId?: string,
  limit: number = 10
): Promise<QuizResult[]> {
  const where: Record<string, unknown> = {};
  if (studentId) where.studentId = studentId;
  if (classId && classId !== 'all') where.student = { classId };

  const results = await prisma.quizResult.findMany({
    where,
    include: { student: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return results.map(r => ({
    id: r.id,
    studentId: r.studentId,
    score: r.score,
    totalCount: r.totalCount,
    earnedTalent: r.earnedTalent,
    answers: r.answers,
    createdAt: r.createdAt.toISOString(),
    studentName: r.student.name,
  }));
}

export async function getQuizRanking(
  classId?: string,
  limit: number = 10
): Promise<{ studentId: string; studentName: string; totalGames: number; avgScore: number; bestScore: number; totalTalentEarned: number }[]> {
  const where: Record<string, unknown> = {};
  if (classId && classId !== 'all') where.student = { classId };

  const results = await prisma.quizResult.groupBy({
    by: ['studentId'],
    _count: { id: true },
    _avg: { score: true },
    _max: { score: true },
    _sum: { earnedTalent: true },
  });

  const studentIds = results.map(r => r.studentId);
  const students = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      ...(classId && classId !== 'all' ? { classId } : {}),
    },
    select: { id: true, name: true },
  });
  const nameMap = new Map(students.map(s => [s.id, s.name]));

  return results
    .filter(r => nameMap.has(r.studentId))
    .map(r => ({
      studentId: r.studentId,
      studentName: nameMap.get(r.studentId) || '알 수 없음',
      totalGames: r._count.id,
      avgScore: Math.round((r._avg.score || 0) * 10) / 10,
      bestScore: r._max.score || 0,
      totalTalentEarned: r._sum.earnedTalent || 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, limit);
}

export async function getQuizQuestionCount(): Promise<number> {
  return prisma.quizQuestion.count({ where: { isActive: true } });
}

// ─── CCM Video 함수 ───

export interface CcmVideo {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeId: string;
  thumbnailUrl: string;
  category: string;
  description: string | null;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getAllCcmVideos(
  category?: string
): Promise<{ videos: CcmVideo[]; total: number }> {
  const where: Record<string, unknown> = { isActive: true };
  if (category && category !== 'all') where.category = category;

  const [total, videos] = await Promise.all([
    prisma.ccmVideo.count({ where }),
    prisma.ccmVideo.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  return {
    videos: videos.map(v => ({
      ...v,
      description: v.description ?? null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
    total,
  };
}

export async function getCcmVideoById(id: string): Promise<CcmVideo | undefined> {
  const v = await prisma.ccmVideo.findFirst({
    where: { id, isActive: true },
  });
  if (!v) return undefined;
  return {
    ...v,
    description: v.description ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export async function createCcmVideo(data: {
  title: string;
  youtubeUrl: string;
  youtubeId: string;
  thumbnailUrl: string;
  category: string;
  description?: string;
  isPinned?: boolean;
}): Promise<string> {
  const v = await prisma.ccmVideo.create({
    data: {
      title: data.title,
      youtubeUrl: data.youtubeUrl,
      youtubeId: data.youtubeId,
      thumbnailUrl: data.thumbnailUrl,
      category: data.category,
      description: data.description || null,
      isPinned: data.isPinned || false,
    },
  });
  return v.id;
}

export async function updateCcmVideo(id: string, data: {
  title?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  category?: string;
  description?: string;
  isPinned?: boolean;
  isActive?: boolean;
}): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.youtubeUrl !== undefined) updateData.youtubeUrl = data.youtubeUrl;
  if (data.youtubeId !== undefined) updateData.youtubeId = data.youtubeId;
  if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  await prisma.ccmVideo.update({ where: { id }, data: updateData });
}

export async function deactivateCcmVideo(id: string): Promise<void> {
  await prisma.ccmVideo.update({ where: { id }, data: { isActive: false } });
}
