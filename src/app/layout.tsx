import type { Metadata, Viewport } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://burn-emotion.vercel.app';
const SITE_NAME = '군고구마 굽기';
const SITE_DESC =
  '캠프파이어 옆에서 익명으로 털어놓는 한국어 채팅. 한 마디 보내면 모닥불 위 군고구마가 18초 동안 익다 갈라져 사라집니다. 회원가입·로그인·메시지 저장 없음. 욕설 필터 없는 감정 쓰레기통.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · 모닥불 옆에서 익명으로 털어놓는 채팅`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: [
    '익명 채팅',
    '감정 쓰레기통',
    '군고구마',
    '모닥불',
    '감정 정리',
    '익명',
    '캠프파이어',
    '심리 위로',
    '감정 분출',
    '하루 마무리',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} · 모닥불 옆에서 익명으로 털어놓는 채팅`,
    description: SITE_DESC,
    // opengraph-image.tsx 가 자동으로 og:image 추가하지만 카톡/네이버가
    // width/height/type 명시되어 있을 때 더 잘 인식. 명시적으로 한 번 더.
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: '군고구마 굽기 · 모닥불 옆에서 익명으로 털어놓는 채팅',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} · 모닥불 옆에서 익명으로 털어놓는 채팅`,
    description: SITE_DESC,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    other: {
      'naver-site-verification': '57baa05bb3a573f9922c341746424dc666fc5980',
    },
  },
  category: 'lifestyle',
};

export const viewport: Viewport = {
  themeColor: '#0b0b10',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Special+Elite&display=swap"
        />
      </head>
      <body>{children}</body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
