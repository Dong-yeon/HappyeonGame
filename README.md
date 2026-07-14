# 군웅록 (群雄錄)

한국 삼국시대 배경의 방치형 액션 플랫포머 게임.

> 게임 기획 · 직업 시스템 · 개발 로드맵 등 상세 문서는 [DESIGN.md](./DESIGN.md) 참고.

## 기술 스택

- **Frontend**: React + Phaser.js (Arcade Physics), Vite
- **Backend**: Spring Boot (예정)
- **DB**: SQLite (예정)
- **모바일 배포**: Capacitor.js (예정)

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속.

## 컨셉

**한국 요괴가 주인공, 인간이 적.** 요괴(이무기 등)가 인간을 포식해 정기를 모으고 진화·승천한다.

## 현재 프로토타입 기능

- **고정 맵 자동 전투**: 요괴(초록 사각형)가 가장 가까운 인간을 향해 자동 이동·좌우 반전·점프·공격
- 여러 층 플랫폼 + 좌우 벽, 인간 병사는 무작위 위치에 리스폰
- 포식 시 경험치 → 레벨업, 정기 → 진화
- **챕터 진행 구조**: 챕터당 10스테이지, 일반 스테이지는 포식으로 진행, 10스테이지째 **챕터 보스 관문**을 깨야 다음 챕터. 챕터 보스는 재료 드랍
- **원정**: 비활성 요괴를 원정 보내 시간당 **재료** 수급(오프라인 포함) → **재료 제단**으로 영구 능력 강화
- **요괴 7종 + 알 부화**: 이무기·구미호·도깨비·불가사리·그슨대·구렁이·저승사자, 각자 다른 분기 진화 트리. "다른 알 부화"로 종족 전환(도감·골드·전생 유지)
- **전 종족 통합 도감 + 수집 보상**: 35개 형태를 종족 탭으로 열람, 발견 형태 1종당 영구 능력 +2%
- **디자인**: 밤하늘 야경(달·별·산 실루엣), 타격/처치 이펙트(피해 숫자·파편·화면 흔들림), 요괴/병사 도형 실루엣, 먹색·금박 UI 테마
- **분기 진화 트리(디지몬식)**: 정기를 모아 진화하되, 육성 방향(공격/체력 훈련)에 따라 최종체가 갈림 (이무기 → 흑룡/청룡/황룡). 진화 시 갈래 선택, 잠긴 갈래는 조건 표시
- **도감**: 도달한 형태를 진화 트리에 등록, 미발견은 ??? 로 표시 (수집 동기)
- **육성(케어)**: 먹이(골드→포만감) / 훈련(포만감→공격·체력 훈련치) / 컨디션(방치 시 탈진→효율↓). 훈련 방향이 진화 갈래를 결정
- **전생(환생) 프레스티지**: 최종 진화 도달 시 전생 → 형태·스테이지·레벨·훈련 초기화, 영구 배율(+50%/회) 획득. 도감·골드·업그레이드는 유지 → 다른 갈래 재도전
- **형태별 스킬**: 각 진화 형태가 고유기(단일 강타/광역/전방 브레스)를 쿨타임마다 자동 발동. HUD에 스킬명·쿨타임 표시
- **방치형 메타**: 골드 드랍 → 업그레이드 상점 → 오프라인 보상
- React HUD: 요괴 형태 / HP / 레벨 / 경험치 / 돌파 진행 / 정기 게이지 / 골드

## 프로젝트 구조

```
src/
├── main.jsx                  # React 엔트리
├── App.jsx                   # 게임 + HUD + 상점 + 오프라인 보상 레이아웃
├── components/
│   ├── HUD.jsx               # React HUD (형태/스테이지/HP/레벨/경험치/정기)
│   ├── Shop.jsx              # 업그레이드 상점 (골드 소비)
│   ├── Evolve.jsx            # 진화 갈래 선택 패널 (정기 충만 시)
│   ├── Codex.jsx             # 도감 (진화 트리 + 발견 현황)
│   ├── Care.jsx              # 육성 패널 (먹이/훈련/컨디션)
│   ├── Expedition.jsx        # 원정 패널 (비활성 요괴 재료 수급 + 재료 제단)
│   ├── Rebirth.jsx           # 전생(환생) 패널 (최종 진화 시)
│   ├── SkillIndicator.jsx    # 형태별 스킬 이름·쿨타임 표시
│   ├── SpeciesPicker.jsx     # 요괴 종족 선택 (신규 플레이어)
│   └── OfflineReward.jsx     # 오프라인 보상 모달
├── data/                     # 순수 데이터 모듈 (구독 패턴)
│   ├── playerData.js         # 레벨/경험치/스탯 (업그레이드·진화·훈련·전생 반영)
│   ├── stageData.js          # 스테이지 진행 상태
│   ├── economyData.js        # 골드/업그레이드/오프라인
│   ├── evolutionData.js      # 요괴 종족/진화 트리/정기/도감
│   ├── careData.js           # 육성 (포만감/훈련/컨디션)
│   ├── rebirthData.js        # 전생(환생) 횟수/영구 배율
│   ├── expeditionData.js     # 원정(재료 수급)/재료 제단
│   ├── skillData.js          # 스킬 표시(이름/쿨타임) — 판정은 GameScene
│   └── saveManager.js        # 서버 저장/복원 오케스트레이터 (+ localStorage 폴백)
└── game/
    ├── PhaserGame.jsx        # Phaser <-> React 래퍼 컴포넌트
    ├── config.js             # Phaser 게임 설정
    ├── constants.js          # 밸런스/크기 상수
    ├── stages.js             # 스테이지 정의 (인간 진영 + 난이도)
    ├── species.js            # 요괴 종족·분기 진화 트리 정의
    ├── scenes/
    │   └── GameScene.js      # 고정 맵 사냥터 (스폰/전투/스테이지 오케스트레이션)
    └── entities/
        ├── Player.js         # 화랑 (가장 가까운 적 자동 타겟팅)
        └── Enemy.js          # 적/보스 (옵션으로 스탯 조정)

backend/                      # Spring Boot + SQLite 저장 API (backend/README.md)
```

## Spring Boot 백엔드 연동 (구현됨)

전체 저장(레벨·경험치·스테이지·골드·업그레이드)이 Spring Boot + SQLite 백엔드에 영속화된다.

- **백엔드**: `backend/` — Spring Boot 3.3 (Java 21) + SQLite. 실행법·API 는 [backend/README.md](./backend/README.md) 참고
- **프론트 연동**: `src/data/saveManager.js` 가 부팅 시 `GET /api/save` 로 복원, 변경/주기/종료 시 저장
- 각 데이터 모듈은 `getSaveState()` / `loadSaveState()` 로 직렬화·복원 (I/O 는 saveManager 가 담당)
- **오프라인 보상**은 서버가 기록한 `lastSeen` 기준으로 계산
- **백엔드 미기동 시 localStorage 폴백** — 프론트 단독 실행 가능
- `vite.config.js` 에 `/api` → `http://localhost:8080` 프록시 설정 완료

### 함께 실행

```bash
# 터미널 1 — 백엔드
cd backend && mvn spring-boot:run
# 터미널 2 — 프론트
npm run dev
```
