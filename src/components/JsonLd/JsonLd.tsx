import { SITE_URL } from '@/lib/siteUrl';

const webApplication = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '불멍',
  alternateName: 'Burn Emotion',
  url: SITE_URL,
  description:
    '모닥불 옆에서 익명으로 털어놓는 한국어 채팅. 욕설 필터 없는 감정 쓰레기통. 채팅창 명령어로 작은 이스터에그 미니게임도 즐길 수 있습니다.',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  inLanguage: 'ko-KR',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
  },
  featureList: [
    '익명 채팅',
    '메시지 비저장 (휘발)',
    '회원가입 불필요',
    '실시간 다중 사용자',
    '캠프파이어 시각화',
    '하루 구워진 고구마 카운트',
    '이스터에그 미니게임 (별똥별 피하기·달까지)',
    '글로벌 TOP 10 리더보드',
  ],
};

const faqPage = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '메시지가 저장되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '아니요. 메시지는 broadcast로만 흐르고 데이터베이스에 저장되지 않습니다. 새로고침하거나 사이트를 떠나면 모두 사라집니다.',
      },
    },
    {
      '@type': 'Question',
      name: '로그인 없이 쓸 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네. 들어오는 순간 무작위로 한국어 닉네임이 만들어지고 그대로 모닥불 옆 자리에 앉습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '욕을 써도 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네. 감정을 거칠게 털어놓는 공간으로 설계되어 있어 별도의 욕설 필터를 두지 않았습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '군고구마는 왜 익나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '한 마디 보내면 모닥불 위에 고구마 한 알이 생기고 약 18초 동안 천천히 익어 갈라집니다. 다 익으면 사라지고 오늘의 카운터가 +1 됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '비용이 드나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '무료입니다. 광고도 없습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '숨겨진 미니게임은 뭔가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '밤하늘의 달을 클릭하면 별똥별 피하기 생존 게임이 시작됩니다. 좌측 상단의 열기구를 클릭하면 "달까지" 점프맵이 시작됩니다. 각각 글로벌 TOP 10 리더보드가 있습니다.',
      },
    },
  ],
};

export function JsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
