import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const isRds = process.env.DATABASE_URL?.includes('.rds.amazonaws.com');
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ...(isRds ? { ssl: { rejectUnauthorized: false } } : {}),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ccmVideos = [
  {
    title: '어린이 신나는 찬양 연속듣기',
    youtubeId: 'kcKMPEon3vw',
    youtubeUrl: 'https://www.youtube.com/watch?v=kcKMPEon3vw',
    category: 'praise',
    description: '신나고 즐거운 어린이 찬양 모음 1시간 연속듣기',
    isPinned: true,
  },
  {
    title: '어린이 축복찬양 모음',
    youtubeId: 'wgbKghqiUZU',
    youtubeUrl: 'https://www.youtube.com/watch?v=wgbKghqiUZU',
    category: 'praise',
    description: '하나님의 축복이 가득한 어린이 찬양 모음 1시간',
    isPinned: true,
  },
  {
    title: '어린이 유치부찬양 연속듣기',
    youtubeId: 'iRPT7mZdbmM',
    youtubeUrl: 'https://www.youtube.com/watch?v=iRPT7mZdbmM',
    category: 'praise',
    description: '유치부·초등부를 위한 귀여운 찬양 연속 모음',
    isPinned: true,
  },
  {
    title: '어린이 해피송, 신나는 율동찬양',
    youtubeId: 'hwEn27MfqTc',
    youtubeUrl: 'https://www.youtube.com/watch?v=hwEn27MfqTc',
    category: 'action',
    description: '몸으로 신나게 따라하는 어린이 율동찬양 2시간 모음',
    isPinned: true,
  },
  {
    title: '엄마아빠가 들려주는 축복송 모음',
    youtubeId: 'LApHZ5d3Eak',
    youtubeUrl: 'https://www.youtube.com/watch?v=LApHZ5d3Eak',
    category: 'special',
    description: '가족이 함께 부르는 아름다운 어린이 축복 찬양 50분',
    isPinned: true,
  },
  {
    title: '어린이 축복송 모음',
    youtubeId: 'upcYiwTYL7Q',
    youtubeUrl: 'https://www.youtube.com/watch?v=upcYiwTYL7Q',
    category: 'praise',
    description: '하나님의 사랑과 축복을 담은 어린이 찬양 40분',
    isPinned: false,
  },
  {
    title: '어린이 예배용 찬양 모음',
    youtubeId: 'XDXtf-Dc1so',
    youtubeUrl: 'https://www.youtube.com/watch?v=XDXtf-Dc1so',
    category: 'worship',
    description: '주일예배·가정예배에 사용하기 좋은 어린이 찬양 2시간',
    isPinned: false,
  },
  {
    title: '신나는 찬양듣기 모음',
    youtubeId: 'D7Zdbrw4fNI',
    youtubeUrl: 'https://www.youtube.com/watch?v=D7Zdbrw4fNI',
    category: 'action',
    description: '활기차고 신나는 어린이 율동찬양 1시간 30분',
    isPinned: false,
  },
  {
    title: '귀여운 어린이 찬양 자장가 3',
    youtubeId: 'w0JtaiKyxd0',
    youtubeUrl: 'https://www.youtube.com/watch?v=w0JtaiKyxd0',
    category: 'worship',
    description: '잠자리에서 듣는 은혜로운 어린이 찬양 1시간',
    isPinned: false,
  },
  {
    title: '어린이 영어찬양 Hello! Jesus',
    youtubeId: 'L1NbYaQ2nms',
    youtubeUrl: 'https://www.youtube.com/watch?v=L1NbYaQ2nms',
    category: 'special',
    description: '영어로 부르는 재미있는 어린이 예수님 찬양 50분',
    isPinned: false,
  },
];

async function main() {
  console.log('🎵 CCM 콘텐츠 시드 시작...');

  const existingVideos = await prisma.ccmVideo.findMany({ select: { youtubeId: true } });
  const existingIds = new Set(existingVideos.map(v => v.youtubeId));

  let added = 0;
  let skipped = 0;

  for (const video of ccmVideos) {
    if (existingIds.has(video.youtubeId)) {
      console.log(`⏭️  건너뜀 (이미 존재): ${video.title}`);
      skipped++;
      continue;
    }
    const thumbnailUrl = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;
    await prisma.ccmVideo.create({
      data: {
        ...video,
        thumbnailUrl,
      },
    });
    console.log(`✅ 등록: ${video.title}`);
    added++;
  }

  console.log(`\n🎉 완료! ${added}개 신규 등록, ${skipped}개 건너뜀 (총 ${existingVideos.length + added}개)`);
  console.log('   http://localhost:3000/ccm 에서 확인하세요.');
}

main()
  .catch(e => {
    console.error('❌ 시드 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
