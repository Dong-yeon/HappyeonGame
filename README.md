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

## 현재 프로토타입 기능

- **고정 맵 자동 전투**: 화랑(파란 사각형)이 가장 가까운 적을 향해 자동 이동·좌우 반전·점프·공격
- 여러 층 플랫폼 + 좌우 벽, 적은 무작위 위치에 리스폰
- 적 처치 시 경험치 → 레벨업 (공격력/최대HP 증가)
- **스테이지 진행 구조**: 적 N킬 → 보스 등장 → 처치 → 클리어 → 다음 스테이지(난이도 상승, 역사 전투 배경)
- **방치형 메타**: 골드 드랍 → 업그레이드 상점(공격력/체력/골드 획득) → 오프라인 보상
- React HUD: 스테이지 / HP바 / 레벨 / 경험치바 / 돌파 진행바 / 골드

## 프로젝트 구조

```
src/
├── main.jsx                  # React 엔트리
├── App.jsx                   # 게임 + HUD + 상점 + 오프라인 보상 레이아웃
├── components/
│   ├── HUD.jsx               # React HUD (스테이지/HP/레벨/경험치/진행)
│   ├── Shop.jsx              # 업그레이드 상점 (골드 소비)
│   └── OfflineReward.jsx     # 오프라인 보상 모달
├── data/                     # 순수 데이터 모듈 (백엔드 연동 지점, 구독 패턴)
│   ├── playerData.js         # 레벨/경험치/스탯 (업그레이드 보너스 반영)
│   ├── stageData.js          # 스테이지 진행 상태
│   └── economyData.js        # 골드/업그레이드/오프라인 (localStorage 영속)
└── game/
    ├── PhaserGame.jsx        # Phaser <-> React 래퍼 컴포넌트
    ├── config.js             # Phaser 게임 설정
    ├── constants.js          # 밸런스/크기 상수
    ├── stages.js             # 스테이지 정의 (역사 전투 배경 + 난이도)
    ├── scenes/
    │   └── GameScene.js      # 고정 맵 사냥터 (스폰/전투/스테이지 오케스트레이션)
    └── entities/
        ├── Player.js         # 화랑 (가장 가까운 적 자동 타겟팅)
        └── Enemy.js          # 적/보스 (옵션으로 스탯 조정)
```

## Spring Boot 백엔드 연동 지점

- `src/data/` 의 각 모듈(`playerData`/`stageData`/`economyData`)에 `loadFromServer()` / `saveToServer()` 스텁 준비됨
- 현재 `economyData` 는 localStorage 로 영속화 → 추후 서버 저장으로 교체
- `vite.config.js` 에 `/api` → `http://localhost:8080` 프록시 설정 완료
- 게임 로직(Phaser)과 데이터 모듈이 분리되어 있어 저장 방식 교체가 쉬움
