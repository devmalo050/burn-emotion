import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '군고구마 굽기 · 모닥불 옆에서 익명으로 털어놓는 채팅',
  description: '캠프파이어 옆에서 채팅을 치면 군고구마가 익어갑니다. 익명으로, 조용히, 천천히.',
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
    </html>
  );
}
