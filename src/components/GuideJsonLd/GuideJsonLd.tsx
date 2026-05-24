const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://burn-emotion.vercel.app';

const howTo = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: '불멍 이용가이드 — 모닥불 옆 채팅 사용법',
  description: '익명 채팅부터 캐릭터 조작, 미니게임, 모닥불 이스터에그까지 단계별 사용법.',
  inLanguage: 'ko-KR',
  step: [
    {
      '@type': 'HowToStep',
      name: '모닥불 옆 채팅',
      text: '채팅창에 한 마디 보내면 모닥불 위에 군고구마 한 알이 생기고 약 18초 동안 천천히 익어 사라집니다. 다 익으면 오늘의 카운터가 +1 됩니다. 메시지는 어디에도 저장되지 않습니다.',
      url: `${SITE_URL}/guide#chat`,
    },
    {
      '@type': 'HowToStep',
      name: '캐릭터 조작',
      text: '채팅창을 비우고 방향키를 누르면 본인 캐릭터가 모닥불 옆을 걸어다닙니다. 스페이스바를 누르면 점프합니다.',
      url: `${SITE_URL}/guide#character`,
    },
    {
      '@type': 'HowToStep',
      name: '모닥불 통과 = 머리 위 불꽃',
      text: '캐릭터가 모닥불 zone 안을 통과하면 머리 위에 작은 불꽃이 5초 동안 따라다닙니다.',
      url: `${SITE_URL}/guide#headfire`,
    },
    {
      '@type': 'HowToStep',
      name: '모닥불 클릭 = 불멍가루',
      text: '모닥불을 클릭하면 컬러 불꽃이 5초간 일렁입니다. 구리·칼륨·리튬·나트륨 등 실제 컬러플레임 분말의 색조를 흉내냅니다.',
      url: `${SITE_URL}/guide#powder`,
    },
    {
      '@type': 'HowToStep',
      name: '미니게임 — 별똥별 피하기',
      text: '채팅창에 "/별똥별"을 입력하거나 밤하늘의 달을 클릭하면 시작됩니다. 떨어지는 별똥별을 피하며 생존, 50초마다 별똥별 다발이 쏟아집니다. 글로벌 TOP 10 리더보드.',
      url: `${SITE_URL}/guide#meteor`,
    },
    {
      '@type': 'HowToStep',
      name: '미니게임 — 우주를 줄게 (점프맵)',
      text: '좌측 상단의 열기구를 클릭하면 위로 끝없이 점프하는 점프맵이 시작됩니다. 8종 발판 메커니즘이 있고 글로벌 TOP 10 리더보드가 붙어 있습니다.',
      url: `${SITE_URL}/guide#jump`,
    },
  ],
};

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: '홈',
      item: SITE_URL,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: '이용가이드',
      item: `${SITE_URL}/guide`,
    },
  ],
};

export function GuideJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}
