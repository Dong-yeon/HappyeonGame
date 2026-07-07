/**
 * 플레이어 게임 데이터 모듈 (레벨 / 경험치 / 스탯)
 *
 * Phaser·React 어디에도 의존하지 않는 순수 모듈로 분리.
 * 추후 Spring Boot 백엔드 연동 시 loadFromServer / saveToServer 의
 * fetch 부분만 구현하면 된다. (vite.config.js 에 /api 프록시 설정됨)
 */

const EXP_BASE = 20; // 레벨 1→2 필요 경험치
const EXP_GROWTH = 1.4; // 레벨당 필요 경험치 증가율

function expForLevel(level) {
  return Math.floor(EXP_BASE * Math.pow(EXP_GROWTH, level - 1));
}

function statsForLevel(level) {
  return {
    maxHp: 100 + (level - 1) * 20,
    attackPower: 10 + (level - 1) * 3,
  };
}

export function createPlayerData() {
  const listeners = new Set();

  const state = {
    level: 1,
    exp: 0,
    expToNext: expForLevel(1),
    hp: statsForLevel(1).maxHp,
    maxHp: statsForLevel(1).maxHp,
    attackPower: statsForLevel(1).attackPower,
    kills: 0,
  };

  function emit() {
    const snapshot = { ...state };
    listeners.forEach((fn) => fn(snapshot));
  }

  return {
    /** 현재 상태 스냅샷 (읽기 전용 복사본) */
    getState() {
      return { ...state };
    },

    /** 상태 변경 구독. 해제 함수를 반환한다. */
    subscribe(fn) {
      listeners.add(fn);
      fn({ ...state });
      return () => listeners.delete(fn);
    },

    /** 경험치 획득. 레벨업 시 true 반환 */
    gainExp(amount) {
      state.exp += amount;
      let leveledUp = false;
      while (state.exp >= state.expToNext) {
        state.exp -= state.expToNext;
        state.level += 1;
        state.expToNext = expForLevel(state.level);
        const stats = statsForLevel(state.level);
        state.maxHp = stats.maxHp;
        state.attackPower = stats.attackPower;
        state.hp = state.maxHp; // 레벨업 시 체력 전체 회복
        leveledUp = true;
      }
      emit();
      return leveledUp;
    },

    /** 피해를 입는다. 사망 시 true 반환 */
    takeDamage(amount) {
      state.hp = Math.max(0, state.hp - amount);
      emit();
      return state.hp <= 0;
    },

    /** 체력 회복 */
    heal(amount) {
      state.hp = Math.min(state.maxHp, state.hp + amount);
      emit();
    },

    /** 처치 수 증가 */
    addKill() {
      state.kills += 1;
      emit();
    },

    /** 사망 후 부활 (프로토타입: 스탯 유지, 체력만 회복) */
    revive() {
      state.hp = state.maxHp;
      emit();
    },

    // ===== 백엔드 연동 지점 (Spring Boot) =====

    /** GET /api/player — 서버에서 저장된 데이터 불러오기 */
    async loadFromServer() {
      // TODO: const res = await fetch('/api/player');
      //       Object.assign(state, await res.json()); emit();
    },

    /** PUT /api/player — 서버에 현재 데이터 저장 */
    async saveToServer() {
      // TODO: await fetch('/api/player', { method: 'PUT',
      //         headers: { 'Content-Type': 'application/json' },
      //         body: JSON.stringify(state) });
    },
  };
}

/** 앱 전역에서 공유하는 싱글턴 인스턴스 */
export const playerData = createPlayerData();
