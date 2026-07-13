/**
 * 전생(환생) 데이터 모듈 — 프레스티지.
 *
 * 최종 진화(승천) 도달 후 전생하면 알로 회귀하되, 영구 능력치 배율을 얻는다.
 * 전생할수록 배율이 누적되어 이후 성장이 빨라진다 (방치형 장기 반복 루프).
 *
 * 순수 모듈 (constants 외 의존 없음). 배율은 playerData 가 구독해서 스탯에 반영한다.
 * 실제 "전생" 시 다른 모듈 초기화는 UI(Rebirth.jsx)가 오케스트레이션한다.
 */
import { REBIRTH } from '../game/constants.js';

export function createRebirthData() {
  const listeners = new Set();

  const state = {
    count: 0, // 전생 횟수
  };

  function snapshot() {
    return {
      count: state.count,
      multiplier: 1 + state.count * REBIRTH.BONUS_PER,
      nextMultiplier: 1 + (state.count + 1) * REBIRTH.BONUS_PER,
    };
  }

  function emit() {
    const snap = snapshot();
    listeners.forEach((fn) => fn(snap));
  }

  return {
    getState() {
      return snapshot();
    },

    /** 현재 영구 배율 (playerData 가 스탯에 반영) */
    getMultiplier() {
      return 1 + state.count * REBIRTH.BONUS_PER;
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },

    /** 전생 1회 (횟수 증가) */
    addRebirth() {
      state.count += 1;
      emit();
    },

    // ===== 저장/복원 =====

    getSaveState() {
      return { count: state.count };
    },

    loadSaveState(s) {
      if (!s) return;
      state.count = s.count ?? 0;
      emit();
    },
  };
}

/** 앱 전역에서 공유하는 싱글턴 인스턴스 */
export const rebirthData = createRebirthData();
