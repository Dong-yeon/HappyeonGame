/**
 * 진화/도감 데이터 모듈 — 분기 진화 트리(디지몬식).
 *
 * 현재 종족/형태(formId)/정기/도감(발견한 형태 목록)을 관리한다.
 * 같은 요괴라도 육성 방향(진화 조건)에 따라 다른 최종체로 갈린다.
 *
 * 진화 조건 평가에 필요한 외부 맥락(context, 예: 우세 스탯)은 호출부가 넘겨준다
 * → 이 모듈은 economyData/playerData 에 의존하지 않는 순수 모듈로 유지.
 */
import { SPECIES, DEFAULT_SPECIES, getSpecies } from '../game/species.js';

/** 진화 조건이 맥락(context)에 부합하는지 */
function meetsRequires(requires, context) {
  if (!requires) return true;
  if (requires.dominant) return (context && context.dominant) === requires.dominant;
  return true;
}

export function createEvolutionData() {
  const listeners = new Set();

  const rootId = SPECIES[DEFAULT_SPECIES].root;
  const state = {
    species: DEFAULT_SPECIES,
    formId: rootId,
    essence: 0,
    discovered: [rootId], // 도감: 지금까지 도달한 형태 id 목록
  };

  function forms() {
    return getSpecies(state.species).forms;
  }

  function currentForm() {
    return forms()[state.formId];
  }

  /** 현재 형태에서 나갈 수 있는 갈래들의 최소 정기 비용 (없으면 null = 최종) */
  function minEssenceCost() {
    const branches = currentForm().evolveTo;
    if (!branches.length) return null;
    return Math.min(...branches.map((b) => b.essence));
  }

  function snapshot() {
    const form = currentForm();
    const minCost = minEssenceCost();
    return {
      species: state.species,
      speciesName: getSpecies(state.species).name,
      formId: state.formId,
      formName: form.name,
      color: form.color,
      tier: form.tier,
      multiplier: form.mult,
      essence: state.essence,
      essenceToEvolve: minCost, // null = 최종(승천)
      isFinal: minCost == null,
      essenceReady: minCost != null && state.essence >= minCost,
      discovered: [...state.discovered],
    };
  }

  function emit() {
    const snap = snapshot();
    listeners.forEach((fn) => fn(snap));
  }

  function markDiscovered(id) {
    if (!state.discovered.includes(id)) state.discovered.push(id);
  }

  return {
    getState() {
      return snapshot();
    },

    getMultiplier() {
      return currentForm().mult;
    },

    getColor() {
      return currentForm().color;
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },

    gainEssence(amount) {
      if (amount <= 0) return;
      state.essence += amount;
      emit();
    },

    /**
     * 현재 형태에서 가능한 진화 갈래 목록 (조건 평가 포함).
     * context 예: { dominant: 'attack' | 'hp' | 'balanced' }
     */
    getAvailableEvolutions(context) {
      const all = forms();
      return currentForm().evolveTo.map((b) => {
        const target = all[b.to];
        const essenceMet = state.essence >= b.essence;
        const unlocked = meetsRequires(b.requires, context);
        return {
          to: b.to,
          name: target.name,
          color: target.color,
          tier: target.tier,
          multiplier: target.mult,
          essenceCost: b.essence,
          essenceMet,
          unlocked,
          hint: b.hint || null,
          discovered: state.discovered.includes(b.to),
          canTake: essenceMet && unlocked,
        };
      });
    },

    /** 특정 갈래로 진화 (조건·정기 충족 시). 성공하면 true */
    evolve(toFormId, context) {
      const branch = currentForm().evolveTo.find((b) => b.to === toFormId);
      if (!branch) return false;
      if (state.essence < branch.essence) return false;
      if (!meetsRequires(branch.requires, context)) return false;
      state.essence -= branch.essence; // 초과분 이월
      state.formId = toFormId;
      markDiscovered(toFormId);
      emit();
      return true;
    },

    // ===== 저장/복원 (saveManager 가 서버 I/O 담당) =====

    getSaveState() {
      return {
        species: state.species,
        formId: state.formId,
        essence: state.essence,
        discovered: [...state.discovered],
      };
    },

    loadSaveState(s) {
      if (!s) return;
      const speciesKey = s.species && SPECIES[s.species] ? s.species : DEFAULT_SPECIES;
      const speciesForms = getSpecies(speciesKey).forms;
      state.species = speciesKey;
      state.formId = s.formId && speciesForms[s.formId] ? s.formId : getSpecies(speciesKey).root;
      state.essence = s.essence ?? 0;
      state.discovered = Array.isArray(s.discovered) && s.discovered.length
        ? s.discovered.filter((id) => speciesForms[id])
        : [state.formId];
      markDiscovered(state.formId);
      emit();
    },
  };
}

/** 앱 전역에서 공유하는 싱글턴 인스턴스 */
export const evolutionData = createEvolutionData();
