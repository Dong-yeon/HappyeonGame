/**
 * 진화/승천 데이터 모듈 — 현재 요괴 종족 / 진화 단계 / 정기.
 *
 * 인간을 포식해 정기를 모으고, 충분히 모이면 다음 단계로 진화한다 (능력치 배율 상승).
 * playerData·stageData·economyData 와 동일한 순수 모듈 + 구독 패턴.
 * 능력치 배율은 값으로만 계산하고, 실제 스탯 반영은 playerData 가 구독해서 처리한다.
 */
import { SPECIES, DEFAULT_SPECIES, getForms } from '../game/species.js';

export function createEvolutionData() {
  const listeners = new Set();

  const state = {
    species: DEFAULT_SPECIES,
    formIndex: 0,
    essence: 0,
  };

  function forms() {
    return getForms(state.species);
  }

  function currentForm() {
    return forms()[state.formIndex];
  }

  /** 외부로 내보내는 파생 스냅샷 */
  function snapshot() {
    const form = currentForm();
    const isFinal = form.essenceToEvolve == null;
    return {
      species: state.species,
      speciesName: SPECIES[state.species].name,
      formIndex: state.formIndex,
      formName: form.name,
      color: form.color,
      multiplier: form.mult,
      essence: state.essence,
      essenceToEvolve: form.essenceToEvolve, // null = 최종(승천)
      canEvolve: !isFinal && state.essence >= form.essenceToEvolve,
      isFinal,
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

    /** 능력치 배율 (playerData 가 구독해서 반영) */
    getMultiplier() {
      return currentForm().mult;
    },

    /** 현재 형태 색 (임시 스프라이트) */
    getColor() {
      return currentForm().color;
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },

    /** 인간 포식으로 정기 획득 */
    gainEssence(amount) {
      if (amount <= 0) return;
      state.essence += amount;
      emit();
    },

    /** 다음 단계로 진화 (성공 시 true) */
    evolve() {
      const form = currentForm();
      if (form.essenceToEvolve == null) return false; // 이미 최종(승천)
      if (state.essence < form.essenceToEvolve) return false;
      state.essence -= form.essenceToEvolve; // 초과분은 이월
      state.formIndex += 1;
      emit();
      return true;
    },

    // ===== 저장/복원 (saveManager 가 서버 I/O 담당) =====

    getSaveState() {
      return {
        species: state.species,
        formIndex: state.formIndex,
        essence: state.essence,
      };
    },

    loadSaveState(s) {
      if (!s) return;
      state.species = s.species && SPECIES[s.species] ? s.species : DEFAULT_SPECIES;
      const maxIndex = getForms(state.species).length - 1;
      state.formIndex = Math.min(Math.max(0, s.formIndex ?? 0), maxIndex);
      state.essence = s.essence ?? 0;
      emit();
    },
  };
}

/** 앱 전역에서 공유하는 싱글턴 인스턴스 */
export const evolutionData = createEvolutionData();
