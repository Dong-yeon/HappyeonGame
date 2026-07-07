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
  COLOR: 0x4dabf7, // 화랑: 파란색
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
  COLOR: 0xe63946, // 적: 빨간색
  MOVE_SPEED: 45, // 좌우 배회 속도 (px/s)
  HP: 20,
  DAMAGE: 10, // 접촉 피해
  EXP_REWARD: 12,
  SPAWN_INTERVAL: 1500, // 스폰 주기 (ms)
  MAX_COUNT: 6, // 맵에 동시에 존재하는 최대 적 수
};
