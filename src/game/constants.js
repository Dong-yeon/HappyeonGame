/** 게임 밸런스 / 크기 관련 상수 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const GROUND_HEIGHT = 60;
export const GROUND_Y = GAME_HEIGHT - GROUND_HEIGHT;

export const PLAYER = {
  WIDTH: 32,
  HEIGHT: 48,
  COLOR: 0x4dabf7, // 화랑: 파란색
  MOVE_SPEED: 160, // 자동 이동 속도 (px/s)
  JUMP_VELOCITY: -480,
  ATTACK_RANGE: 90, // 공격 사거리 (px)
  ATTACK_COOLDOWN: 500, // 공격 쿨타임 (ms)
  OBSTACLE_SENSE: 70, // 장애물 감지 거리 (px)
  INVINCIBLE_TIME: 800, // 피격 후 무적 시간 (ms)
};

export const ENEMY = {
  WIDTH: 30,
  HEIGHT: 40,
  COLOR: 0xe63946, // 적: 빨간색
  MOVE_SPEED: -60, // 왼쪽으로 이동
  HP: 20,
  DAMAGE: 10, // 접촉 피해
  EXP_REWARD: 12,
  SPAWN_INTERVAL: 1800, // 스폰 주기 (ms)
};

export const OBSTACLE = {
  WIDTH: 36,
  COLOR: 0x8d99ae, // 장애물: 회색
  MIN_HEIGHT: 40,
  MAX_HEIGHT: 70,
  SPAWN_INTERVAL: 3200, // 스폰 주기 (ms)
};
