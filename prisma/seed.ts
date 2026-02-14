import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // 관리자 계정 생성
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { loginId: 'admin' },
    update: {},
    create: {
      loginId: 'admin',
      password: adminPassword,
      name: '관리자',
      role: 'admin',
      phone: '010-1234-5678',
    },
  });
  console.log('✅ Admin user created:', admin.loginId);

  // 교사 계정 생성
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teacher = await prisma.user.upsert({
    where: { loginId: 'teacher' },
    update: {},
    create: {
      loginId: 'teacher',
      password: teacherPassword,
      name: '초등부샘',
      role: 'teacher',
      phone: '010-9876-5432',
    },
  });
  console.log('✅ Teacher user created:', teacher.loginId);

  // 반 생성
  const classes = [
    { name: '다윗반', grade: 1 },
    { name: '솔로몬반', grade: 2 },
    { name: '다니엘반', grade: 3 },
    { name: '요셉반', grade: 4 },
    { name: '모세반', grade: 5 },
    { name: '여호수아반', grade: 6 },
  ];

  for (const cls of classes) {
    await prisma.class.upsert({
      where: { id: `class-${cls.grade}` },
      update: {},
      create: {
        id: `class-${cls.grade}`,
        name: cls.name,
        grade: cls.grade,
        teacherId: teacher.id,
      },
    });
  }
  console.log('✅ Classes created');

  // 학생 데이터
  const studentNames = [
    { name: '유주원', grade: 1 },
    { name: '김하린', grade: 2 },
    { name: '이승리', grade: 2 },
    { name: '이하라', grade: 2 },
    { name: '이태양', grade: 2 },
    { name: '고다윤', grade: 3 },
    { name: '김주아', grade: 3 },
    { name: '이서윤', grade: 3 },
    { name: '이해밀', grade: 3 },
    { name: '한희찬', grade: 3 },
    { name: '문예은', grade: 4 },
    { name: '이서빈', grade: 4 },
    { name: '이예찬', grade: 4 },
    { name: '이성윤', grade: 6 },
    { name: '이예건', grade: 6 },
  ];

  for (const student of studentNames) {
    const birthYear = 2026 - 6 - student.grade;
    const birthday = new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);

    await prisma.student.create({
      data: {
        name: student.name,
        grade: student.grade,
        birthday,
        talentBalance: 0,
        classId: `class-${student.grade}`,
      },
    });
  }
  console.log('✅ Students created');

  // 상품 샘플 데이터
  const products = [
    { name: '연필 세트', description: '6자루 세트', price: 15, stock: 20 },
    { name: '지우개', description: '귀여운 동물 모양', price: 5, stock: 30 },
    { name: '노트', description: '줄 노트 A5', price: 10, stock: 25 },
    { name: '색연필', description: '12색 세트', price: 30, stock: 15 },
    { name: '스티커', description: '반짝이 스티커', price: 8, stock: 50 },
    { name: '필통', description: '캐릭터 필통', price: 25, stock: 10 },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }
  console.log('✅ Products created');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
