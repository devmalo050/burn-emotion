import type { Metadata } from 'next';
import Link from 'next/link';
import { GuideJsonLd } from '@/components/GuideJsonLd/GuideJsonLd';
import styles from './page.module.css';

const TITLE = '이용가이드 — 불멍에서 노는 법';
const DESCRIPTION =
  '익명 채팅, 캐릭터 조작, 별똥별 피하기, 점프맵, 모닥불의 숨은 것들까지 — 불멍의 모든 사용법을 한 페이지에서.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/guide' },
  openGraph: {
    type: 'article',
    locale: 'ko_KR',
    url: '/guide',
    siteName: '불멍',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: '불멍 이용가이드',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
};

export default function GuidePage() {
  return (
    <main className={styles.page}>
      <GuideJsonLd />
      <div className={styles.container}>
        <nav className={styles.topNav} aria-label="페이지 이동">
          <Link href="/" className={styles.backLink}>
            ← 모닥불로 돌아가기
          </Link>
        </nav>

        <header className={styles.header}>
          <h1 className={styles.h1}>
            <span aria-hidden="true">🔥 </span>
            불멍에서 노는 법
          </h1>
          <p className={styles.lede}>
            모닥불 옆에 앉아 한 마디 던지고, 캐릭터를 움직이고, 숨겨진 미니게임까지.
            처음 왔다면 이 페이지 한 번 훑어보면 다 알아요.
          </p>
        </header>

        <section id="chat" className={styles.section}>
          <h2 className={styles.h2}>1. 모닥불 옆 채팅</h2>
          <p>
            화면 아래 채팅창에 한 마디 보내면 모닥불 위에 군고구마 한 알이 생기고
            <strong> 약 18초 동안 </strong>천천히 익어 갈라집니다. 다 익으면 사라지고
            오늘 구워진 고구마 카운터가 +1 됩니다.
          </p>
          <p>
            메시지는 어디에도 저장되지 않아요. 새로고침하거나 사이트를 떠나면 모두
            사라집니다. 닉네임은 들어오는 순간 무작위로 만들어지고 로그인은 필요하지 않아요.
          </p>
        </section>

        <section id="character" className={styles.section}>
          <h2 className={styles.h2}>2. 캐릭터 조작</h2>
          <p>
            채팅창을 비우고 <kbd>방향키</kbd>를 누르면 본인 캐릭터가 모닥불 옆을
            걸어다닙니다. <kbd>Space</kbd>를 누르면 점프해요. 다른 접속자들 캐릭터
            움직임도 실시간으로 보입니다.
          </p>
          <p>
            휴대폰·태블릿 같은 터치 기기에서는 화면 왼쪽 절반을 손가락으로 누른 채
            끌면 그 자리에 가상 조이스틱이 떠서 캐릭터가 움직이고, 오른쪽 아래
            점프 버튼을 누르면 점프해요.
          </p>
        </section>

        <section id="headfire" className={styles.section}>
          <h2 className={styles.h2}>3. 머리 위 불꽃</h2>
          <p>
            캐릭터를 모닥불 한가운데로 직접 걸어 올리면 머리 위에 작은 불꽃이
            5초 동안 따라다닙니다. 옆으로 비껴 지나가면 안 붙어요. 다른 사람한테도
            보여요.
          </p>
          <p>
            모닥불을 클릭한 뒤 5초 안에 캐릭터로 모닥불을 지나가면, 머리 위 불꽃이
            평소 주황색 대신 무지개색으로 붙어요.
          </p>
        </section>

        <section id="powder" className={styles.section}>
          <h2 className={styles.h2}>4. 불멍가루</h2>
          <p>
            모닥불을 마우스로 클릭하면 컬러 불꽃이 5초간 일렁입니다. 구리·칼륨·나트륨
            등 실제 컬러플레임 분말의 색조를 흉내낸 효과예요. 같이 접속한 사람들에게도
            다 보입니다.
          </p>
        </section>

        <section id="meteor" className={styles.section}>
          <h2 className={styles.h2}>5. 미니게임 — 별똥별 피하기</h2>
          <p>
            <strong>진입:</strong> 밤하늘의 <strong>달</strong>을 클릭하세요.
          </p>
          <p>
            <strong>룰:</strong> 떨어지는 별똥별을 피하면서 최대한 오래 버티는 생존 게임.
            50초마다 별똥별 다발이 한꺼번에 쏟아져요. 캐릭터 이동은
            방향키, 점프는 <kbd>Space</kbd>. 터치 기기에서는 왼쪽 조이스틱으로 이동하고
            오른쪽 점프 버튼으로 점프해요.
          </p>
          <p>
            <strong>리더보드:</strong> 달 바로 옆(오른쪽 아래)에서 잔잔히 빛나는 작은 별을
            클릭하면 TOP 10이 나와요.
          </p>
        </section>

        <section id="jump" className={styles.section}>
          <h2 className={styles.h2}>6. 미니게임 — 달까지 (점프맵)</h2>
          <p>
            <strong>진입:</strong> 좌측 상단에 떠 있는 <strong>열기구</strong>를 클릭하세요.
          </p>
          <p>
            <strong>룰:</strong> 통나무판·재가 된 발판·떠다니는 통나무·사슬 그네·상하 리프트·
            금속 코일(스프링)·달궈진 철망(즉사)·깎인 통나무(밂) 등 8종 발판을 밟으며
            위로 끝없이 올라가는 점프맵.
          </p>
          <p>
            <strong>조작:</strong> <kbd>←</kbd> <kbd>→</kbd>로 좌우 이동, <kbd>Space</kbd>로 점프해요.
            점프맵은 키보드 전용이라 터치 기기에서는 플레이할 수 없어요.
          </p>
          <p>
            <strong>리더보드:</strong> 열기구 뒤 작은 구름을 클릭하면 TOP 10이 나와요.
          </p>
        </section>

        <section id="faq" className={styles.section}>
          <h2 className={styles.h2}>자주 묻는 질문</h2>
          <dl className={styles.faq}>
            <dt>메시지가 저장되나요?</dt>
            <dd>
              아니요. 메시지는 그 순간 다른 접속자들 화면에 잠깐 떴다가
              어디에도 저장되지 않고 사라집니다. 새로고침하거나 사이트를 떠나면
              본인 화면에서도 모두 사라집니다.
            </dd>

            <dt>로그인 없이 쓸 수 있나요?</dt>
            <dd>
              네. 들어오는 순간 무작위로 한국어 닉네임이 만들어지고 그대로 모닥불 옆 자리에 앉습니다.
            </dd>

            <dt>욕을 써도 되나요?</dt>
            <dd>
              네. 감정을 거칠게 털어놓는 공간으로 설계되어 있어 별도의 욕설 필터를 두지 않았습니다.
            </dd>
          </dl>
        </section>

        <nav className={styles.bottomNav} aria-label="페이지 이동">
          <Link href="/" className={styles.backLink}>
            ← 모닥불로 돌아가기
          </Link>
        </nav>
      </div>
    </main>
  );
}
