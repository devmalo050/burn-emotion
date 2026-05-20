# 인내의 숲 — 발판 종류 메커니즘 통합 설계

_2026-05-20_

## 개요

점프맵(인내의 숲)에 8종 발판 디자인을 게임 메커니즘과 함께 통합한다.
발판 디자인은 Claude Design 핸드오프(Platforms.html)로 이미 구현됨
(`PlatformDesigns.tsx`, 21종). 그중 8종을 게임에 적용한다.

## 발판 8종 + 메커니즘

| kind | 디자인 | 동작 |
|---|---|---|
| `basic` | 통나무판 (PlankBasic) | 그냥 밟음 |
| `breakable` | 재가 된 발판 (AshCrust) | 착지 0.4초 후 발판 영구 소멸 |
| `drift` | 떠다니는 통나무 (FloatingLog) | x 좌우 사인파 이동 |
| `swing` | 사슬 그네 (ChainPlatform) | x 가 호를 그리며 스윙 |
| `lift` | 상하 리프트 (VerticalLift) | world y 상하 사인파 이동 |
| `spring` | 금속 코일 (CoilSpring) | 착지 즉시 자동 부스트(점프 2배) |
| `hot` | 달궈진 철망 (IronGrate) | 착지 = 즉사 |
| `rolling` | 깎인 통나무 (NotchedLog) | 착지 중 캐릭터를 한쪽으로 밂(방향 랜덤) |

확정된 동작 규칙:
- 움직이는 발판 위 캐릭터는 **동승하지 않음** — 발판만 움직이고 캐릭터는 제자리
- 스프링: 스페이스바 없이 **자동** 튕김, 부스트 = 일반 점프 초기속도 ×2
- 부서지는 발판: 한 번 쓰면 영구 소멸(재생성 없음)
- 뜨거운 발판: 라이프 시스템 없이 즉사
- 굴러가는 발판: 미는 방향은 발판마다 랜덤(왼/오)

## 데이터 모델

```ts
type PlatformKind =
  | 'basic' | 'breakable' | 'drift' | 'swing'
  | 'lift' | 'spring' | 'hot' | 'rolling';

interface Platform {
  id: number;
  x: number;            // world x (px)
  y: number;            // world y (시작점 0, 위로 +)
  width: number;
  kind: PlatformKind;
  bornX?: number;       // 움직이는 발판 기준 x
  bornY?: number;       // lift 기준 y
  phase?: number;       // 사인파 위상 오프셋
  breakAt?: number | null; // breakable — 밟힌 시각(performance.now)
  rollDir?: -1 | 1;     // rolling — 미는 방향
}
```

## 아키텍처

`platforms/platformLogic.ts` 에 발판 종류별 정의를 한 곳에 모은다.
각 종류 = `{ 스폰 가중치(난이도 함수), 스폰 초기화, 매 프레임 effect }`.
새 발판 추가 시 이 파일 한 항목 + `PlatformDesigns.tsx` 컴포넌트만 추가.

매 프레임 effect 는 캐릭터 물리와 강결합이므로 컨텍스트 객체
(`{ charXRef, charYRef, charVyRef, charOnGroundRef, dt, now, ... }`)를
인자로 받는 함수로 둔다. `useJumpGame` RAF 가 이를 호출.

## 스폰 분포 (난이도 곡선)

기존 `difficulty = min(1, maxY / 4000)` 활용. 시작 발판들은 모두 `basic`
(안전한 출발). spawn loop 부터 종류 혼합.

종류별 등장 임계(difficulty) + 가중치:
- `basic`: 항상. 가중치 = `100 * (1 - difficulty*0.65)` (초반 주력 → 후반 35%)
- `spring`: 처음부터, 가중치 8 고정 (보너스, 희소)
- `drift`: difficulty ≥ 0.10, 가중치 `difficulty * 28`
- `lift`: difficulty ≥ 0.20, 가중치 `difficulty * 24`
- `swing`: difficulty ≥ 0.30, 가중치 `difficulty * 22`
- `breakable`: difficulty ≥ 0.25, 가중치 `difficulty * 30`
- `rolling`: difficulty ≥ 0.45, 가중치 `difficulty * 26`
- `hot`: difficulty ≥ 0.50, 가중치 `difficulty * 20`

매 발판 스폰 시 임계 통과한 종류들의 가중치 합에서 룰렛 선택.
연속 위험 발판(hot 2연속 등)은 도달 불가 구간을 만들 수 있으므로,
직전 발판이 `hot` 이면 다음은 `hot` 제외.

## 너비 가변

`PlatformDesigns.tsx` 의 발판 본체를 `width` prop 가변형으로 리팩터.
각 발판을 본체 컴포넌트(`width` 받음) + 갤러리 래퍼로 분리 —
갤러리는 래퍼(ArtBg/LandingHost 포함), 게임은 본체만 사용.

내부 고정 요소 처리:
- 굴러가는 통나무: 양끝 단면 디스크 고정, 가운데 pill 만 가변
- 스프링: base 발판만 가변, 코일은 중앙 고정
- 사슬 그네: plank 가변, 사슬은 양끝에 맞춰 따라감

게임 발판 충돌 박스는 기존대로 발판 윗면 y 라인 + x 범위.
비주얼 높이는 디자인대로(종류별 12~22px).

## 렌더링

`JumpGameOverlay` 의 `platforms.map` 에서 `p.kind` 로 발판 본체 컴포넌트
선택, `width={p.width}` 전달. 움직이는 발판(`drift`/`swing`/`lift`)은
x/y 가 매 프레임 변하므로 `useJumpGame` RAF 가 `platformsRef` 의 좌표를
갱신하고, overlay 가 매 프레임 DOM(left/bottom)으로 반영 — 캐릭터 갱신과
동일한 ref 기반 방식. spawn/cleanup 시점에만 React state 갱신.

## 파일 구조

- `platforms/platformLogic.ts` — 신규. PlatformKind, 종류별 정의, 스폰 선택
- `platforms/PlatformDesigns.tsx` — 본체 컴포넌트 width 가변 리팩터
- `useJumpGame.ts` — platformLogic 사용, RAF 에 종류별 effect
- `JumpGameOverlay.tsx` — kind 별 발판 본체 렌더

## 범위 밖 (YAGNI)

- 라이프/체력 시스템
- 자연물 발판(버섯·이끼 돌) — 기능이 basic 과 동일, 미사용
- 발판 디자인 변형 다수(21종 중 13종 미사용) — 갤러리에만 존재
