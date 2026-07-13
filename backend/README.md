# 군웅록 백엔드 (Spring Boot)

게임 전체 저장 데이터(레벨·경험치·스테이지·골드·업그레이드)를 영속화하는 REST API 서버.

## 기술 스택

- Spring Boot 3.3 (Java 21)
- Spring Data JPA + Hibernate
- SQLite (`data/gunungrok.db` 파일에 저장)

## 실행

```bash
cd backend
mvn spring-boot:run
# 또는 빌드 후 실행
mvn -DskipTests package
java -jar target/gunungrok-backend-0.1.0.jar
```

서버는 `http://localhost:8080` 에서 뜨고, DB 파일은 `backend/data/gunungrok.db` 에 생성된다.
프론트(Vite)의 `/api` 프록시가 이 포트로 연결되므로, 프론트와 백엔드를 각각 실행하면 자동 연동된다.

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET`  | `/api/save?userId=local` | 저장된 `{player, stage, economy, lastSeen}` 반환 (없으면 `204`) |
| `PUT`  | `/api/save?userId=local` | 본문 `{player, stage, economy}` 저장. `lastSeen` 은 서버가 저장 시각으로 기록 |
| `POST` | `/api/save?userId=local` | `PUT` 과 동일 (브라우저 종료 시 `navigator.sendBeacon` 용) |

- `lastSeen`(서버 저장 시각)은 재접속 시 **오프라인 보상 계산**의 기준이 된다.
- `userId` 는 현재 단일 플레이어 프로토타입이라 `local` 고정. 추후 인증 연동 시 실제 사용자 ID로 대체.

## 저장 데이터 형식 예시

```json
{
  "player":  { "level": 8, "exp": 0, "hp": 160, "kills": 50 },
  "stage":   { "stageIndex": 3, "kills": 0 },
  "economy": { "gold": 9999, "upgrades": { "attack": 5, "maxHp": 5, "goldGain": 3 }, "goldPerSec": 6.0 },
  "lastSeen": 1783917726963
}
```

## 프론트 연동

프론트의 `src/data/saveManager.js` 가 부팅 시 `GET /api/save` 로 복원하고,
상태 변경/주기(15초)/종료 시 `PUT`(또는 `sendBeacon POST`)로 저장한다.
**백엔드가 꺼져 있으면 자동으로 localStorage 폴백 모드로 동작**하므로 프론트 단독 실행도 가능하다.
