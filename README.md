# 군웅록 (群雄錄)

한국 삼국시대 배경의 방치형 액션 플랫포머 게임.

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

- 화랑 캐릭터(파란 사각형)가 자동으로 오른쪽 전진
- 전방 장애물(회색 사각형) 감지 시 자동 점프
- 사거리 내 적(빨간 사각형) 자동 공격 — 검격 이펙트, 적 HP바
- 적 처치 시 경험치 획득 → 레벨업 (공격력/최대HP 증가, 체력 회복)
- React HUD: HP바 / 레벨 / 경험치바 / 처치 수

## 프로젝트 구조

```
src/
├── main.jsx                  # React 엔트리
├── App.jsx                   # 게임 + HUD 레이아웃
├── components/
│   └── HUD.jsx               # React HUD (HP/레벨/경험치)
├── data/
│   └── playerData.js         # 게임 데이터 모듈 (레벨/경험치, 백엔드 연동 지점)
└── game/
    ├── PhaserGame.jsx        # Phaser <-> React 래퍼 컴포넌트
    ├── config.js             # Phaser 게임 설정
    ├── constants.js          # 밸런스/크기 상수
    ├── scenes/
    │   └── GameScene.js      # 메인 스테이지 (무한 스크롤, 스폰, 전투)
    └── entities/
        ├── Player.js         # 화랑 (자동 이동/점프/공격)
        └── Enemy.js          # 기본 적 (왼쪽 이동)
```

## Spring Boot 백엔드 연동 지점

- `src/data/playerData.js` 의 `loadFromServer()` / `saveToServer()` 에 fetch 구현
- `vite.config.js` 에 `/api` → `http://localhost:8080` 프록시 설정 완료
- 게임 로직(Phaser)과 데이터(playerData)가 분리되어 있어 저장 방식 교체가 쉬움
