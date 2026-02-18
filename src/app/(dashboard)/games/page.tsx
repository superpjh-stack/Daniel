import Link from 'next/link';

export const metadata = {
  title: '게임 - 다니엘',
};

const games = [
  {
    id: 'brick-breaker',
    title: '벽돌깨기',
    description: '성경 벽돌을 깨며 퀴즈를 풀어보세요!',
    emoji: '🧱',
    href: '/games/brick-breaker',
    available: true,
  },
  {
    id: 'noahs-ark',
    title: '노아의 방주',
    description: '동물들을 방주에 빈틈없이 태워보세요!',
    emoji: '🚢',
    href: '/games/noahs-ark',
    available: true,
  },
  {
    id: 'davids-sling',
    title: '다윗의 물맷돌',
    description: '골리앗의 약점을 조준하여 물맷돌을 날려보세요!',
    emoji: '\u2694\uFE0F',
    href: '/games/davids-sling',
    available: true,
  },
  {
    id: 'five-loaves',
    title: '오병이어의 기적',
    description: '군중에게 빵과 물고기를 나눠주며 기적을 체험하세요!',
    emoji: '\u{1F35E}',
    href: '/games/five-loaves',
    available: true,
  },
  {
    id: 'lost-sheep',
    title: '잃은 양 찾기',
    description: '목자가 되어 미로 속 잃은 양을 구출하세요!',
    emoji: '\uD83D\uDC11',
    href: '/games/lost-sheep',
    available: true,
  },
];

export default function GamesPage() {
  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">게임</h1>
        <p className="text-sm text-slate-500 mt-1">성경 내용을 재미있게 배워봐요!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {games.map((game) => (
          <Link
            key={game.id}
            href={game.href}
            className={`
              block p-6 rounded-2xl border-2 transition-all duration-200
              ${game.available
                ? 'border-indigo-200 bg-white hover:border-indigo-400 hover:shadow-lg cursor-pointer'
                : 'border-slate-200 bg-slate-50 cursor-default opacity-60'}
            `}
          >
            <div className="text-4xl mb-3">{game.emoji}</div>
            <h2 className="text-lg font-bold text-slate-800">{game.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{game.description}</p>
            <div className="mt-4">
              {game.available ? (
                <span className="inline-block px-4 py-2 bg-indigo-500 text-white text-sm font-bold rounded-lg">
                  게임 시작
                </span>
              ) : (
                <span className="inline-block px-4 py-2 bg-slate-200 text-slate-500 text-sm font-bold rounded-lg">
                  준비 중
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
