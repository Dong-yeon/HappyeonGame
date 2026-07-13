/**
 * 육성(케어) 데이터 모듈 — 포만감 / 훈련 / 컨디션.
 *
 * 방치형 자동 전투 위에 얹는 능동적 "키우기" 레이어.
 * - 먹이: 포만감 회복 (골드 소비는 호출부가 처리)
 * - 훈련: 포만감(에너지)을 소모해 공격/체력 훈련치 상승 → 진화 갈래를 결정
 * - 포만감은 시간이 지나면 감소, 탈진하면 성장 효율 하락
 *
 * 순수 모듈 (constants 외 의존 없음). 능력치 보너스는 playerData 가 구독해서 반영.
 */
import { CARE } from '../game/constants.js';

export function createCareData() {
  const listeners = new Set();

  const state = {
    fullness: CARE.MAX_FULLNESS,
    training: { attack: 0, hp: 0 },
    lastTick: Date.now(),
  };

  /** 경과 시간만큼 포만감 감소 (emit 은 호출자가 판단) */
  function applyDecay(now = Date.now()) {
    const elapsedMin = (now - state.lastTick) / 60000;
    if (elapsedMin <= 0) return false;
    const dec = elapsedMin * CARE.DECAY_PER_MIN;
    if (dec <= 0) return false;
    state.lastTick = now;
    const before = state.fullness;
    state.fullness = Math.max(0, state.fullness - dec);
    return state.fullness !== before;
  }

  function condition() {
    if (state.fullness < CARE.STARVING_BELOW) return '탈진';
    if (state.fullness < 40) return '허기';
    if (state.fullness < 80) return '보통';
    return '배부름';
  }

  function snapshot() {
    return {
      fullness: Math.round(state.fullness),
      maxFullness: CARE.MAX_FULLNESS,
      training: { ...state.training },
      condition: condition(),
      starving: state.fullness < CARE.STARVING_BELOW,
      canTrain: state.fullness >= CARE.TRAIN_COST,
      dominant:
        state.training.attack > state.training.hp
          ? 'attack'
          : state.training.hp > state.training.attack
            ? 'hp'
            : 'balanced',
    };
  }

  function emit() {
    const snap = snapshot();
    listeners.forEach((fn) => fn(snap));
  }

  return {
    getState() {
      applyDecay();
      return snapshot();
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },

    /** 시간 경과 반영 (UI 가 주기적으로 호출) */
    tick() {
      if (applyDecay()) emit();
    },

    /** 먹이 주기 (골드 차감은 호출부에서) */
    feed() {
      applyDecay();
      state.fullness = Math.min(CARE.MAX_FULLNESS, state.fullness + CARE.FEED_AMOUNT);
      emit();
    },

    /** 훈련 (포만감 소모). 에너지 부족 시 false */
    train(type) {
      if (type !== 'attack' && type !== 'hp') return false;
      applyDecay();
      if (state.fullness < CARE.TRAIN_COST) return false;
      state.fullness -= CARE.TRAIN_COST;
      state.training[type] += 1;
      emit();
      return true;
    },

    /** 진화 갈래 결정용 우세 훈련 방향 */
    getDominant() {
      return snapshot().dominant;
    },

    /** 전생: 훈련·포만감 초기화 */
    reset() {
      state.fullness = CARE.MAX_FULLNESS;
      state.training = { attack: 0, hp: 0 };
      state.lastTick = Date.now();
      emit();
    },

    /** 훈련치에 따른 능력치 보너스 (playerData 반영) */
    getStatBonus() {
      return {
        attack: state.training.attack * CARE.TRAIN_ATTACK_BONUS,
        hp: state.training.hp * CARE.TRAIN_HP_BONUS,
      };
    },

    /** 컨디션에 따른 획득 배율 (탈진 시 감소) */
    getGainMultiplier() {
      applyDecay();
      return state.fullness < CARE.STARVING_BELOW ? CARE.STARVING_GAIN_MUL : 1;
    },

    // ===== 저장/복원 =====

    getSaveState() {
      applyDecay();
      return {
        fullness: state.fullness,
        training: { ...state.training },
        lastTick: state.lastTick,
      };
    },

    loadSaveState(s) {
      if (!s) return;
      state.fullness = typeof s.fullness === 'number' ? s.fullness : CARE.MAX_FULLNESS;
      state.training = { attack: 0, hp: 0, ...(s.training || {}) };
      state.lastTick = s.lastTick || Date.now();
      applyDecay(); // 오프라인 동안의 포만감 감소 반영
      emit();
    },
  };
}

/** 앱 전역에서 공유하는 싱글턴 인스턴스 */
export const careData = createCareData();
