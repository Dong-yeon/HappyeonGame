/** 게임 밸런스 / 크기 관련 상수 */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const WALL_THICKNESS = 20;

/**
 * 고정 맵 플랫폼 정의 (x, y = 중심 좌표)
 * 배열 첫 항목은 맵 바닥(ground), 나머지는 공중 플랫폼.
 * 적 스폰 위치도 이 목록에서 무작위로 고른다.
 */
export const PLATFORMS = [
  { x: GAME_WIDTH / 2, y: 700, width: GAME_WIDTH, height: 40, isGround: true },
  { x: 300, y: 520, width: 340, height: 24 },
  { x: 980, y: 520, width: 340, height: 24 },
  { x: 640, y: 340, width: 360, height: 24 },
];

export const PLAYER = {
  WIDTH: 32,
  HEIGHT: 48,
  COLOR: 0x2f9e44, // 요괴 기본색 (실제 색은 진화 단계에 따라 evolutionData 가 결정)
  MOVE_SPEED: 170, // 이동 속도 (px/s)
  JUMP_VELOCITY: -600,
  ATTACK_RANGE: 95, // 공격 사거리 (px)
  ATTACK_COOLDOWN: 500, // 공격 쿨타임 (ms)
  ATTACK_VERTICAL_TOLERANCE: 48, // 이 높이차 이내의 적만 공격 (같은 층 판정)
  VERTICAL_REACH: 40, // 적이 이만큼 위에 있으면 점프해서 올라감
  INVINCIBLE_TIME: 800, // 피격 후 무적 시간 (ms)
};

export const ENEMY = {
  WIDTH: 30,
  HEIGHT: 40,
  COLOR: 0xc9a26b, // 인간 병사: 갑주(가죽/청동)색
  MOVE_SPEED: 45, // 좌우 배회 속도 (px/s)
  HP: 28, // 파워 성장이 처치 속도로 체감되도록 상향 (기존 20)
  DAMAGE: 10, // 접촉 피해
  EXP_REWARD: 12,
  SPAWN_INTERVAL: 1500, // 스폰 주기 (ms)
  MAX_COUNT: 6, // 맵에 동시에 존재하는 최대 적 수
};

export const BOSS = {
  WIDTH: 56,
  HEIGHT: 72,
  COLOR: 0x845ef7, // 인간 장수/퇴마사: 남보라색
  MOVE_SPEED: 30, // 보스는 느리게 이동
  HP_MUL: 6, // 같은 스테이지 일반 적 대비 체력 배율 (초반 보스 정체 완화, 기존 10)
  DAMAGE_MUL: 1.6, // 접촉 피해 배율
  EXP_MUL: 8, // 경험치 보상 배율
  GOLD_MUL: 10, // 골드 보상 배율
  ESSENCE_MUL: 3, // 정기 보상 배율 (보스 포식) — 티어를 통째로 채우던 스파이크 완화 (기존 12)
};

export const ESSENCE = {
  PER_HUMAN: 8, // 인간 1명 포식당 기본 정기
  PER_STAGE: 3, // 스테이지(0-base index)당 추가 정기 (후반 급증 완화, 기존 4)
};

export const REBIRTH = {
  BONUS_PER: 0.5, // 전생 1회당 영구 능력치 배율 +50%
};

export const CODEX = {
  BONUS_PER_FORM: 0.02, // 도감 형태 1종 발견당 영구 능력치 +2% (전 종족 수집 보상)
};

export const CHAPTER = {
  SIZE: 10, // 챕터당 스테이지 수 (마지막 스테이지에 챕터 보스)
  BOSS_HP_MUL: 3, // 챕터 보스 = 일반 보스 대비 체력 배율
  BOSS_SIZE_MUL: 1.4, // 챕터 보스 크기 배율
  MATERIAL_BASE: 5, // 챕터 보스 처치 재료 보상 기본
  MATERIAL_PER_CHAPTER: 3, // 챕터당 추가 재료
};

export const EXPEDITION = {
  RATE_PER_FORM: 0.3, // 원정 재료/분 (해당 종족의 발견 형태 1종당)
  ALTAR_BASE_COST: 10, // 재료 제단: 능력 강화 기본 비용
  ALTAR_COST_GROWTH: 1.6, // 능력 강화 비용 증가율
  ALTAR_BONUS_PER: 0.05, // 능력 강화 1레벨당 영구 능력 +5%
  SKILL_BASE_COST: 15, // 재료 제단: 스킬 강화 기본 비용
  SKILL_COST_GROWTH: 1.6, // 스킬 강화 비용 증가율
  SKILL_BONUS_PER: 0.08, // 스킬 강화 1레벨당 스킬 피해 +8%
  ESSENCE_BOOST_COST: 6, // 정기 촉진 1회 재료 비용
  ESSENCE_BOOST_PCT: 0.15, // 정기 촉진 1회 = 다음 진화 필요 정기의 15%
};

export const CARE = {
  MAX_FULLNESS: 100,
  FEED_AMOUNT: 25, // 먹이 1회당 포만감 회복
  FEED_COST: 15, // 먹이 1회 골드 비용
  TRAIN_COST: 20, // 훈련 1회당 소모 포만감(에너지)
  DECAY_PER_MIN: 2, // 분당 포만감 감소량 (약 50분에 완전 허기)
  STARVING_BELOW: 15, // 이 미만이면 탈진 상태
  STARVING_GAIN_MUL: 0.5, // 탈진 시 정기/골드 획득 배율
  TRAIN_ATTACK_BONUS: 2, // 공격 훈련치 1당 공격력 +2
  TRAIN_HP_BONUS: 15, // 체력 훈련치 1당 최대 HP +15
};

export const GOLD = {
  ENEMY_BASE: 5, // 일반 적 기본 골드 (처치 감소분 보정)
  ENEMY_PER_STAGE: 2, // 스테이지(0-base index)당 추가 골드
  OFFLINE_EFFICIENCY: 0.5, // 오프라인 획득 = 활성 속도의 50%
  OFFLINE_CAP_HOURS: 8, // 오프라인 보상 상한 (시간)
  OFFLINE_MIN_SEC: 60, // 이 시간 이상 비웠을 때만 오프라인 보상
};
