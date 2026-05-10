import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Cloudflare Workers 어댑터 — Next 16 (App Router + Edge OG) 그대로 동작.
// 캐시는 Workers 기본 incremental cache (KV / R2) 안 쓰고 in-memory 정도로 시작.
export default defineCloudflareConfig({});
