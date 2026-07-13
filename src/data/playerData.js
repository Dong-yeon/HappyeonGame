/**
 * 플레이어 게임 데이터 모듈 (레벨 / 경험치 / 스탯)
 *
 * Phaser·React 어디에도 의존하지 않는 순수 모듈로 분리.
 * 업그레이드(economyData) 보너스를 스탯에 반영한다 (일방 의존: playerData → economyData).
 * 추후 Spring Boot 백엔드 연동 시 loadFromServer / saveToServer 의 fetch 부분만 구현하면 된다.
 */
import { economyData } from './economyData.js';
import { evolutionData } from './evolutionData.js';
import { careData } from './careData.js';
import { rebirthData } from './rebirthData.js';

const EXP_BASE = 20; // 레벨 1→2 필요 경험치
const EXP_GROWTH = 1.4; // 레벨당 필요 경험치 증가율

function expForLevel(level) {
  return Math.floor(EXP_BASE * Math.pow(EXP_GROWTH, level - 1));
}

/** 업그레이드 보너스를 뺀 순수 레벨 기반 스탯 */
function baseStatsForLevel(level) {
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
    hp: 0,
    maxHp: 0,
    attackPower: 0,
    kills: 0,
  };

  /**
   * 레벨 기반 스탯 + 업그레이드 보너스로 maxHp/attackPower 재계산.
   * fullHeal=true 면 체력 전체 회복(레벨업 시), false 면 늘어난 만큼만 회복(업그레이드 시).
   */
  function applyStats({ fullHeal = false } = {}) {
    const base = baseStatsForLevel(state.level);
    const bonus = economyData.getBonuses();
    const care = careData.getStatBonus(); // 훈련 보너스
    const mult = evolutionData.getMultiplier() * rebirthData.getMultiplier(); // 진화 단계 × 전생 영구 배율
    const newMax = Math.round((base.maxHp + bonus.maxHp + care.hp) * mult);
    const delta = newMax - state.maxHp;
    state.maxHp = newMax;
    state.attackPower = Math.round((base.attackPower + bonus.attack + care.attack) * mult);
    if (fullHeal) {
      state.hp = newMax;
    } else {
      state.hp = Math.min(newMax, state.hp + Math.max(0, delta));
    }
  }

  function emit() {
    const snapshot = { ...state };
    listeners.forEach((fn) => fn(snapshot));
  }

  // 초기 스탯 설정 (레벨1 + 저장된 업그레이드 반영)
  applyStats({ fullHeal: true });

  // 업그레이드/진화/훈련 변경 시 스탯 반영 (보너스·배율이 실제로 바뀐 경우에만)
  let lastStatSig = '';
  function syncFromModifiers() {
    const b = economyData.getBonuses();
    const c = careData.getStatBonus();
    const sig = `${b.attack}/${b.maxHp}/${evolutionData.getMultiplier()}/${c.attack}/${c.hp}/${rebirthData.getMultiplier()}`;
    if (sig === lastStatSig) return;
    lastStatSig = sig;
    applyStats({ fullHeal: false });
    emit();
  }
  economyData.subscribe(syncFromModifiers);
  evolutionData.subscribe(syncFromModifiers);
  careData.subscribe(syncFromModifiers);
  rebirthData.subscribe(syncFromModifiers);

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
        applyStats({ fullHeal: true }); // 레벨업 시 체력 전체 회복
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

    /** 전생: 레벨/경험치 초기화 (누적 포식 수는 유지) */
    rebirthReset() {
      state.level = 1;
      state.exp = 0;
      state.expToNext = expForLevel(1);
      applyStats({ fullHeal: true });
      emit();
    },

    // ===== 저장/복원 (saveManager 가 서버 I/O 를 담당) =====

    /** 서버 저장용 직렬화 (스탯은 레벨+업그레이드로 파생되므로 저장 안 함) */
    getSaveState() {
      return {
        level: state.level,
        exp: state.exp,
        hp: state.hp,
        kills: state.kills,
      };
    },

    /** 서버에서 받은 상태로 복원 */
    loadSaveState(s) {
      if (!s) return;
      state.level = s.level ?? 1;
      state.exp = s.exp ?? 0;
      state.expToNext = expForLevel(state.level);
      state.kills = s.kills ?? 0;
      applyStats({ fullHeal: false }); // 레벨+업그레이드로 maxHp/공격력 재계산
      if (typeof s.hp === 'number') {
        state.hp = Math.min(state.maxHp, Math.max(0, s.hp)); // 저장된 현재 HP 복원
      }
      emit();
    },
  };
}

/** 앱 전역에서 공유하는 싱글턴 인스턴스 */
export const playerData = createPlayerData();
