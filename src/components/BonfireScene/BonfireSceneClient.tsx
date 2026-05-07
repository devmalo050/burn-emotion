'use client';
import dynamic from 'next/dynamic';

const BonfireScene = dynamic(
  () => import('./BonfireScene').then((m) => m.BonfireScene),
  {
    ssr: false,
    loading: () => <div className="stage" />,
  }
);

export default function BonfireSceneClient() {
  return <BonfireScene />;
}
