# 요괴록 (妖怪錄)

한국 요괴가 주인공인 방치형 요괴 육성 게임.

> 게임 기획 · 진화 트리 · 개발 로드맵 등 상세 문서는 [DESIGN.md](./DESIGN.md) 참고.

## 기술 스택

- **Frontend**: React + Phaser.js (Arcade Physics), Vite
- **Backend**: Spring Boot + SQLite (선택 — 없으면 브라우저 로컬 저장으로 단독 동작)
- **웹 배포**: itch.io (정적 HTML5 빌드)
- **모바일 배포**: Capacitor.js (iOS/Android — 반응형/터치 대응)

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속. (백엔드 없이도 로컬 저장으로 동작)

## 빌드 & itch.io 배포

```bash
npm run build        # dist/ 정적 빌드 생성
npm run build:itch   # 빌드 + itch.io 업로드용 yokairok-web.zip 생성
```

- `vite.config.js` 의 `base: './'` 로 **상대 경로** 빌드 → itch.io iframe(하위 경로)에서 정상 동작
- 백엔드 미연동 환경(itch)에서는 **전체 진행이 브라우저 localStorage 에 저장**되어 새로고침에도 유지
- itch.io: 새 프로젝트 → **Kind of project: HTML** → `yokairok-web.zip` 업로드 → *This file will be played in the browser* 체크 → 뷰포트 1280×720, **Fullscreen 허용** 권장
- 도트·사운드·아이콘 모두 코드/데이터 URI 로 자체 생성 → 외부 에셋·CDN 의존 없음

## 모바일 앱 (Capacitor)

웹 빌드를 그대로 감싸 iOS/Android 네이티브 앱으로 배포한다.

```bash
# 1) 네이티브 플랫폼 생성 (로컬 1회 — Android Studio / Xcode 필요)
npx cap add android
npx cap add ios

# 2) 빌드 → 네이티브 동기화 → IDE 열기
npm run cap:android   # = vite build + cap sync + cap open android
npm run cap:ios
```

- `capacitor.config.json`: appId `com.yokairok.app`, appName `요괴록`, webDir `dist`
- **반응형/터치 대응**: 1280×720 고정 디자인을 화면 크기에 맞춰 통째로 `transform: scale()` (레터박스) → 폰·태블릿 어디서든 UI 겹침 없이 축소. 절대배치 좌표계 유지
- **세로 모드**: 회전 안내 오버레이 표시("가로로 돌려서 플레이하세요"). 앱 매니페스트에서 landscape 고정 권장
- 터치: 확대/당겨서새로고침/텍스트선택/탭하이라이트 억제, `viewport-fit=cover` + safe-area 대응
- 저장: 네이티브에서도 `/api` 백엔드가 없으면 **localStorage 전체 저장**으로 단독 동작
- `android/`·`ios/` 네이티브 폴더는 `.gitignore` 처리 (로컬에서 SDK 로 생성)

## 컨셉

**한국 요괴가 주인공, 인간이 적.** 요괴(이무기 등)가 인간을 포식해 정기를 모으고 진화·승천한다.

## 현재 프로토타입 기능

- **고정 맵 자동 전투**: 요괴(초록 사각형)가 가장 가까운 인간을 향해 자동 이동·좌우 반전·점프·공격
- 여러 층 플랫폼 + 좌우 벽, 인간 병사는 무작위 위치에 리스폰
- 포식 시 경험치 → 레벨업, 정기 → 진화
- **챕터 진행 구조**: 챕터당 10스테이지, 일반 스테이지는 포식으로 진행, 10스테이지째 **인간 토벌대 관문**(대장 장수 + 호위 병사 웨이브)을 격파해야 다음 챕터. 대장 처치 시 돌파(호위 퇴각), 격파 재료 드랍. 챕터가 오를수록 호위 증가
- **비정기 토벌대 기습**: 악명도(누적 처치)가 쌓이면 진행과 무관한 **기습 웨이브**(기습 대장 + 정예 병사)가 난입 → 전멸시키면 재료·정기·골드 큰 보상
- **원정**: 비활성 요괴를 원정 보내 시간당 **재료** 수급(오프라인 포함) → **재료 제단**으로 영구 능력 강화
- **요괴 7종 + 알 부화**: 이무기·구미호·도깨비·불가사리·그슨대·구렁이·저승사자, 각자 다른 분기 진화 트리. "다른 알 부화"로 종족 전환(도감·골드·전생 유지)
- **전 종족 통합 도감 + 수집 보상**: 42개 형태(35 + 궁극체 7)를 종족 탭으로 열람, 발견 형태 1종당 영구 능력 +2%
- **특수 진화(합체) — 궁극체**: 종족별 히든 궁극체. 최종체 3갈래를 모두 도감에 발견 + **합체의 정수**(원정 재료로 제작) 소모로 각성 (디지몬 합체 진화 개념)
- **디자인**: 도트(픽셀아트) 캐릭터 — 코드로 생성한 픽셀 스프라이트(**종족별 고유 도트** 7종 + 형태 색·인간 병사·장수). 렌더 시 **자동 외곽선 + 상단 림 하이라이트 + 접지 음영 + 바닥 그림자 + 숨쉬기 바운스**로 입체감 있는 상업적 품질. 밤하늘 야경(달·별·산), 타격/처치 이펙트, 먹색·금박 UI 테마
- **분기 진화 트리(디지몬식)**: 정기를 모아 진화하되, 육성 방향(공격/체력 훈련)에 따라 최종체가 갈림 (이무기 → 흑룡/청룡/황룡). 진화 시 갈래 선택, 잠긴 갈래는 조건 표시
- **도감**: 도달한 형태를 진화 트리에 등록, 미발견은 ??? 로 표시 (수집 동기)
- **육성(케어)**: 먹이(골드→포만감) / 훈련(포만감→공격·체력 훈련치) / 컨디션(방치 시 탈진→효율↓). 훈련 방향이 진화 갈래를 결정
- **전생(환생) 프레스티지**: 최종 진화 도달 시 전생 → 형태·스테이지·레벨·훈련 초기화, 영구 배율(+50%/회) 획득. 도감·골드·업그레이드는 유지 → 다른 갈래 재도전
- **형태별 스킬**: 각 진화 형태가 고유기(단일 강타/광역/전방 브레스)를 쿨타임마다 자동 발동. HUD에 스킬명·쿨타임 표시
- **방치형 메타**: 골드 드랍 → 업그레이드 상점 → 오프라인 보상. 거대 수치는 K/M/B/T… 축약 표기
- **리워드 광고 훅**: 오프라인 보상 2배 · 정기 ×2 부스트(시간제·쿨다운). 광고 시청 오버레이 (실제 SDK 연결 지점은 `src/data/adData.js`)
- **리텐션 메타**: 일일 미션(매일 3개 순환) · 업적 15종 · 출석 보상(7일 주기), 수령 가능 시 배지 표시
- **사운드**: Web Audio 절차 합성 효과음(공격·포식·진화·스킬·보스) + 은은한 BGM, 음소거/볼륨 설정
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
│   ├── Retention.jsx         # 일일 미션·업적·출석 보상 패널 (탭)
│   ├── Settings.jsx          # 설정 (음소거/볼륨/저장 초기화/게임 정보)
│   ├── Title.jsx             # 타이틀(시작) 화면 — 탭 시 사운드 활성화
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
│   ├── retentionData.js      # 일일 미션/업적/출석 (리텐션 메타)
│   ├── skillData.js          # 스킬 표시(이름/쿨타임) — 판정은 GameScene
│   └── saveManager.js        # 서버 저장/복원 오케스트레이터 (+ localStorage 폴백)
└── game/
    ├── PhaserGame.jsx        # Phaser <-> React 래퍼 컴포넌트
    ├── config.js             # Phaser 게임 설정
    ├── constants.js          # 밸런스/크기 상수
    ├── stages.js             # 스테이지 정의 (인간 진영 + 난이도)
    ├── species.js            # 요괴 종족·분기 진화 트리 정의
    ├── pixelArt.js           # 코드 생성 픽셀 스프라이트 (요괴/병사/장수)
    ├── audio.js              # Web Audio 절차적 효과음·BGM 엔진
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
