/**
 * 리워드 광고 데이터/서비스 — 광고 시청 후 보상을 주는 훅.
 *
 * ⚠ 실제 광고 SDK 연결 지점: watch() 안의 시뮬레이션(setTimeout)을 실제 리워드 광고
 *   호출(예: Capacitor AdMob rewarded)로 교체하면 된다. 성공(끝까지 시청) 시 true 로 resolve.
 *
 * 제공 훅:
 *  - 오프라인 보상 2배: watch() 성공 → economyData.doubleOfflineReward() (호출부 처리)
 *  - 정기 부스트: activateEssenceBoost() → 일정 시간 정기 획득 ×N (쿨다운 있음)
 */
import { AD } from '../game/constants.js';

export function createAdData() {
  const listeners = new Set();
  const state = {
    watching: false,
    essenceBoostUntil: 0, // 정기 부스트 만료 시각(ms)
    essenceCooldownUntil: 0, // 다음 부스트 가능 시각(ms)
  };

  const now = () => Date.now();

  function snapshot() {
    const t = now();
    return {
      watching: state.watching,
      essenceBoostActive: state.essenceBoostUntil > t,
      essenceBoostRemaining: Math.max(0, state.essenceBoostUntil - t),
      essenceCooldownRemaining: Math.max(0, state.essenceCooldownUntil - t),
      canBoost: state.essenceBoostUntil <= t && state.essenceCooldownUntil <= t,
    };
  }

  function emit() {
    const s = snapshot();
    listeners.forEach((fn) => fn(s));
  }

  const api = {
    getState() {
      return snapshot();
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },

    /**
     * 리워드 광고 시청 (성공 시 true). 실제 SDK 는 여기에 연결.
     * 시청 중에는 watching=true 로 표시(오버레이용).
     */
    watch() {
      if (state.watching) return Promise.resolve(false);
      state.watching = true;
      emit();
      return new Promise((resolve) => {
        setTimeout(() => {
          state.watching = false;
          emit();
          resolve(true); // 실제 SDK: 광고 완료 콜백에서 resolve(true), 취소 시 resolve(false)
        }, AD.WATCH_MS);
      });
    },

    /** 현재 정기 획득 배율 (부스트 활성 시 ×MULT, 아니면 ×1) — GameScene 이 참조 */
    getEssenceMultiplier() {
      return state.essenceBoostUntil > now() ? AD.ESSENCE_BOOST_MULT : 1;
    },

    /** 정기 부스트 활성화 (부스트/쿨다운 중이면 false) */
    activateEssenceBoost() {
      const t = now();
      if (state.essenceBoostUntil > t || state.essenceCooldownUntil > t) return false;
      state.essenceBoostUntil = t + AD.ESSENCE_BOOST_MS;
      state.essenceCooldownUntil = state.essenceBoostUntil + AD.ESSENCE_BOOST_COOLDOWN_MS;
      emit();
      return true;
    },
  };

  return api;
}

export const adData = createAdData();
