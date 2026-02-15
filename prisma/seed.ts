import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const isRds = process.env.DATABASE_URL?.includes('.rds.amazonaws.com');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ...(isRds ? { ssl: { rejectUnauthorized: false } } : {}),
});
const adapter = new PrismaPg(pool);
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

  // 성경퀴즈 시드 데이터 (50문제)
  const quizQuestions = [
    // 구약 (15)
    { question: '하나님이 세상을 만드신 기간은?', option1: '6일', option2: '7일', option3: '3일', option4: '10일', answer: 1, category: 'old_testament', difficulty: 'easy', reference: '창세기 1장' },
    { question: '아담과 하와가 살았던 곳은?', option1: '에덴동산', option2: '바벨탑', option3: '시내산', option4: '갈릴리', answer: 1, category: 'old_testament', difficulty: 'easy', reference: '창세기 2:8' },
    { question: '노아의 방주가 머무른 산은?', option1: '시내산', option2: '아라랏산', option3: '감람산', option4: '갈멜산', answer: 2, category: 'old_testament', difficulty: 'easy', reference: '창세기 8:4' },
    { question: '하나님이 아브라함에게 약속한 땅은?', option1: '이집트', option2: '바벨론', option3: '가나안', option4: '앗수르', answer: 3, category: 'old_testament', difficulty: 'easy', reference: '창세기 12:7' },
    { question: '모세가 십계명을 받은 산은?', option1: '감람산', option2: '시내산', option3: '아라랏산', option4: '갈멜산', answer: 2, category: 'old_testament', difficulty: 'easy', reference: '출애굽기 19:20' },
    { question: '홍해를 가른 사람은?', option1: '여호수아', option2: '엘리야', option3: '모세', option4: '다윗', answer: 3, category: 'old_testament', difficulty: 'easy', reference: '출애굽기 14:21' },
    { question: '여리고 성벽을 무너뜨린 방법은?', option1: '대포로 공격', option2: '7일간 행진', option3: '터널 파기', option4: '사다리 오르기', answer: 2, category: 'old_testament', difficulty: 'medium', reference: '여호수아 6:20' },
    { question: '다윗이 골리앗을 이긴 무기는?', option1: '칼', option2: '창', option3: '물맷돌', option4: '활', answer: 3, category: 'old_testament', difficulty: 'easy', reference: '사무엘상 17:49' },
    { question: '솔로몬이 하나님께 구한 것은?', option1: '재물', option2: '지혜', option3: '긴 수명', option4: '군대', answer: 2, category: 'old_testament', difficulty: 'easy', reference: '열왕기상 3:9' },
    { question: '사자 굴에 들어갔던 사람은?', option1: '모세', option2: '다윗', option3: '다니엘', option4: '요나', answer: 3, category: 'old_testament', difficulty: 'easy', reference: '다니엘 6:16' },
    { question: '큰 물고기 뱃속에 3일간 있었던 사람은?', option1: '요나', option2: '베드로', option3: '노아', option4: '여호수아', answer: 1, category: 'old_testament', difficulty: 'easy', reference: '요나 1:17' },
    { question: '불 수레를 타고 하늘에 올라간 선지자는?', option1: '모세', option2: '엘리사', option3: '엘리야', option4: '이사야', answer: 3, category: 'old_testament', difficulty: 'medium', reference: '열왕기하 2:11' },
    { question: '바벨탑을 쌓은 이유는?', option1: '홍수 대비', option2: '하늘에 닿으려고', option3: '적을 막으려고', option4: '보물 저장', answer: 2, category: 'old_testament', difficulty: 'medium', reference: '창세기 11:4' },
    { question: '이스라엘 민족이 광야에서 먹은 음식은?', option1: '빵과 포도주', option2: '만나와 메추라기', option3: '생선과 떡', option4: '과일과 채소', answer: 2, category: 'old_testament', difficulty: 'medium', reference: '출애굽기 16:13-15' },
    { question: '십계명의 첫 번째 계명은?', option1: '살인하지 말라', option2: '거짓 증거하지 말라', option3: '나 외에 다른 신을 두지 말라', option4: '부모를 공경하라', answer: 3, category: 'old_testament', difficulty: 'medium', reference: '출애굽기 20:3' },
    // 신약 (15)
    { question: '예수님이 태어나신 곳은?', option1: '나사렛', option2: '예루살렘', option3: '베들레헴', option4: '갈릴리', answer: 3, category: 'new_testament', difficulty: 'easy', reference: '마태복음 2:1' },
    { question: '예수님에게 세례를 준 사람은?', option1: '베드로', option2: '요한', option3: '바울', option4: '야고보', answer: 2, category: 'new_testament', difficulty: 'easy', reference: '마태복음 3:13' },
    { question: '예수님의 제자는 몇 명이었나요?', option1: '10명', option2: '12명', option3: '7명', option4: '5명', answer: 2, category: 'new_testament', difficulty: 'easy', reference: '마태복음 10:1' },
    { question: '예수님이 물 위를 걸으신 곳은?', option1: '요단강', option2: '홍해', option3: '갈릴리 바다', option4: '사해', answer: 3, category: 'new_testament', difficulty: 'easy', reference: '마태복음 14:25' },
    { question: '오병이어의 기적에서 물고기는 몇 마리?', option1: '2마리', option2: '3마리', option3: '5마리', option4: '7마리', answer: 1, category: 'new_testament', difficulty: 'easy', reference: '마태복음 14:17' },
    { question: '예수님이 십자가에 못 박히신 곳은?', option1: '감람산', option2: '시온산', option3: '골고다', option4: '다볼산', answer: 3, category: 'new_testament', difficulty: 'easy', reference: '마태복음 27:33' },
    { question: '예수님이 부활하신 후 며칠 만에 승천하셨나요?', option1: '3일', option2: '7일', option3: '40일', option4: '50일', answer: 3, category: 'new_testament', difficulty: 'medium', reference: '사도행전 1:3' },
    { question: '예수님이 처음 행하신 기적은?', option1: '오병이어', option2: '물을 포도주로', option3: '맹인 치유', option4: '폭풍 잠잠', answer: 2, category: 'new_testament', difficulty: 'medium', reference: '요한복음 2:11' },
    { question: '착한 사마리아인 이야기에서 강도 만난 사람을 도운 사람은?', option1: '제사장', option2: '레위인', option3: '사마리아인', option4: '바리새인', answer: 3, category: 'new_testament', difficulty: 'easy', reference: '누가복음 10:33' },
    { question: '탕자의 비유에서 아버지가 아들에게 준 것은?', option1: '채찍', option2: '반지와 신발', option3: '편지', option4: '돈주머니', answer: 2, category: 'new_testament', difficulty: 'medium', reference: '누가복음 15:22' },
    { question: '성경에서 가장 짧은 구절은?', option1: '예수께서 우셨다', option2: '기도하라', option3: '하나님은 사랑이시라', option4: '항상 기뻐하라', answer: 1, category: 'new_testament', difficulty: 'hard', reference: '요한복음 11:35' },
    { question: '사도 바울이 원래 이름은?', option1: '시몬', option2: '사울', option3: '마태', option4: '바나바', answer: 2, category: 'new_testament', difficulty: 'medium', reference: '사도행전 13:9' },
    { question: '예수님이 태어날 때 찾아온 동방박사는 몇 명?', option1: '2명', option2: '3명', option3: '4명', option4: '성경에 인원 없음', answer: 4, category: 'new_testament', difficulty: 'hard', reference: '마태복음 2:1' },
    { question: '주기도문이 나오는 복음서는?', option1: '마가복음', option2: '마태복음', option3: '요한복음', option4: '사도행전', answer: 2, category: 'new_testament', difficulty: 'medium', reference: '마태복음 6:9' },
    { question: '요한계시록은 성경의 몇 번째 책인가요?', option1: '63번째', option2: '65번째', option3: '66번째', option4: '70번째', answer: 3, category: 'new_testament', difficulty: 'hard', reference: '요한계시록' },
    // 인물 (10)
    { question: '성경에서 가장 오래 산 사람은?', option1: '아담', option2: '므두셀라', option3: '노아', option4: '아브라함', answer: 2, category: 'person', difficulty: 'medium', reference: '창세기 5:27' },
    { question: '이삭의 아버지는?', option1: '아브라함', option2: '야곱', option3: '모세', option4: '다윗', answer: 1, category: 'person', difficulty: 'easy', reference: '창세기 21:3' },
    { question: '야곱의 12아들 중 이집트 총리가 된 사람은?', option1: '유다', option2: '베냐민', option3: '요셉', option4: '르우벤', answer: 3, category: 'person', difficulty: 'easy', reference: '창세기 41:41' },
    { question: '힘이 센 사람으로 유명한 사사는?', option1: '기드온', option2: '삼손', option3: '여호수아', option4: '엘리', answer: 2, category: 'person', difficulty: 'easy', reference: '사사기 14-16장' },
    { question: '다윗의 아들로 지혜로운 왕은?', option1: '솔로몬', option2: '압살롬', option3: '르호보암', option4: '요시야', answer: 1, category: 'person', difficulty: 'easy', reference: '열왕기상 1:39' },
    { question: '예수님의 어머니 이름은?', option1: '마르다', option2: '마리아', option3: '룻', option4: '에스더', answer: 2, category: 'person', difficulty: 'easy', reference: '마태복음 1:18' },
    { question: '예수님을 세 번 부인한 제자는?', option1: '요한', option2: '야고보', option3: '베드로', option4: '도마', answer: 3, category: 'person', difficulty: 'easy', reference: '마태복음 26:75' },
    { question: '다메섹 도상에서 회심한 사도는?', option1: '베드로', option2: '바울', option3: '요한', option4: '안드레', answer: 2, category: 'person', difficulty: 'medium', reference: '사도행전 9:3-6' },
    { question: '시어머니 나오미를 따라간 며느리는?', option1: '라헬', option2: '에스더', option3: '룻', option4: '한나', answer: 3, category: 'person', difficulty: 'medium', reference: '룻기 1:16' },
    { question: '왕 앞에서 유대인을 구한 왕비는?', option1: '룻', option2: '에스더', option3: '마리아', option4: '드보라', answer: 2, category: 'person', difficulty: 'medium', reference: '에스더 7:3' },
    // 사건 (5)
    { question: '출애굽 때 이집트에 내린 재앙은 몇 가지?', option1: '5가지', option2: '7가지', option3: '10가지', option4: '12가지', answer: 3, category: 'event', difficulty: 'medium', reference: '출애굽기 7-12장' },
    { question: '오순절에 일어난 사건은?', option1: '예수 부활', option2: '성령 강림', option3: '예수 승천', option4: '바벨탑 사건', answer: 2, category: 'event', difficulty: 'medium', reference: '사도행전 2:1-4' },
    { question: '예수님이 십자가에서 부활하기까지 며칠?', option1: '1일', option2: '2일', option3: '3일', option4: '7일', answer: 3, category: 'event', difficulty: 'easy', reference: '마태복음 16:21' },
    { question: '바벨탑 사건으로 생긴 결과는?', option1: '홍수', option2: '언어가 달라짐', option3: '전쟁', option4: '기근', answer: 2, category: 'event', difficulty: 'easy', reference: '창세기 11:7-9' },
    { question: '노아 홍수 때 비가 내린 기간은?', option1: '7일', option2: '40일', option3: '100일', option4: '1년', answer: 2, category: 'event', difficulty: 'medium', reference: '창세기 7:12' },
    // 일반 (5)
    { question: '성경은 총 몇 권으로 이루어져 있나요?', option1: '39권', option2: '27권', option3: '66권', option4: '72권', answer: 3, category: 'general', difficulty: 'easy', reference: null },
    { question: '구약성경은 몇 권인가요?', option1: '27권', option2: '39권', option3: '46권', option4: '50권', answer: 2, category: 'general', difficulty: 'easy', reference: null },
    { question: '성경의 첫 번째 책은?', option1: '출애굽기', option2: '시편', option3: '마태복음', option4: '창세기', answer: 4, category: 'general', difficulty: 'easy', reference: null },
    { question: '사복음서에 해당하지 않는 것은?', option1: '마태복음', option2: '마가복음', option3: '사도행전', option4: '요한복음', answer: 3, category: 'general', difficulty: 'medium', reference: null },
    { question: '시편 23편에서 하나님을 무엇에 비유하나요?', option1: '왕', option2: '목자', option3: '반석', option4: '불', answer: 2, category: 'general', difficulty: 'easy', reference: '시편 23:1' },
  ];

  for (const q of quizQuestions) {
    await prisma.quizQuestion.create({ data: q });
  }
  console.log(`✅ Quiz questions created: ${quizQuestions.length} questions`);

  // CCM 동영상 시드 데이터 (10곡)
  const ccmVideos = [
    { title: '주님은 좋은 분', youtubeUrl: 'https://www.youtube.com/watch?v=yBSgBn0C3iY', youtubeId: 'yBSgBn0C3iY', category: 'praise', description: '초등부 예배에서 가장 많이 부르는 찬양', isPinned: true },
    { title: '예수님이 좋은 걸', youtubeUrl: 'https://www.youtube.com/watch?v=7VBek5MR2c0', youtubeId: '7VBek5MR2c0', category: 'praise', description: '어린이 찬양 베스트', isPinned: true },
    { title: '하나님은 너를 지키시는 분', youtubeUrl: 'https://www.youtube.com/watch?v=qKsGRX4sXCY', youtubeId: 'qKsGRX4sXCY', category: 'praise', description: '시편 121편을 바탕으로 한 찬양' },
    { title: '내 주를 가까이 하게 함은', youtubeUrl: 'https://www.youtube.com/watch?v=dLnNJwHjqGM', youtubeId: 'dLnNJwHjqGM', category: 'worship', description: '찬송가 338장 어린이 버전' },
    { title: '주의 사랑이 나를 감싸네', youtubeUrl: 'https://www.youtube.com/watch?v=g0kXpJ-TuBg', youtubeId: 'g0kXpJ-TuBg', category: 'worship', description: '조용한 워십 찬양' },
    { title: '할렐루야 (율동)', youtubeUrl: 'https://www.youtube.com/watch?v=GS08quYKDOE', youtubeId: 'GS08quYKDOE', category: 'action', description: '신나는 율동 찬양! 함께 춤춰요' },
    { title: '하나님의 세계 (율동)', youtubeUrl: 'https://www.youtube.com/watch?v=QR4feMcMFP4', youtubeId: 'QR4feMcMFP4', category: 'action', description: '자연을 주제로 한 율동 찬양' },
    { title: '나 같은 죄인 살리신', youtubeUrl: 'https://www.youtube.com/watch?v=CDdvReNKKuk', youtubeId: 'CDdvReNKKuk', category: 'worship', description: 'Amazing Grace 한국어 버전' },
    { title: '전능하신 하나님', youtubeUrl: 'https://www.youtube.com/watch?v=pBexKn1jW-c', youtubeId: 'pBexKn1jW-c', category: 'special', description: '특송으로 자주 부르는 찬양' },
    { title: '주 하나님 지으신 모든 세계', youtubeUrl: 'https://www.youtube.com/watch?v=E2z1Gc4ej08', youtubeId: 'E2z1Gc4ej08', category: 'special', description: '찬송가 79장 어린이 특송' },
  ];

  for (const video of ccmVideos) {
    await prisma.ccmVideo.create({
      data: {
        ...video,
        thumbnailUrl: `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`,
        description: video.description || null,
        isPinned: video.isPinned || false,
      },
    });
  }
  console.log(`✅ CCM videos created: ${ccmVideos.length} videos`);

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
