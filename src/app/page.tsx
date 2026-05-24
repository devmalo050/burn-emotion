import { AppMenu } from '@/components/AppMenu/AppMenu';
import BonfireSceneClient from '@/components/BonfireScene/BonfireSceneClient';
import { JsonLd } from '@/components/JsonLd/JsonLd';
import { SeoContent } from '@/components/SeoContent/SeoContent';

export default function Page() {
  return (
    <>
      <JsonLd />
      <SeoContent />
      <AppMenu />
      <BonfireSceneClient />
    </>
  );
}
