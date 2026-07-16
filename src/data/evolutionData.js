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
import { CODEX } from '../game/constants.js';

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
    discovered: [], // 도감: 지금까지 도달한 형태 id (전 종족 통합), 종족 선택 시 채워짐
    chosen: false, // 종족을 선택했는지 (신규 플레이어는 선택 화면 표시)
  };

  /** 특정 form id 가 어느 종족에든 존재하는지 */
  function isKnownForm(id) {
    return Object.values(SPECIES).some((sp) => sp.forms[id]);
  }

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
      chosen: state.chosen,
    };
  }

  function emit() {
    const snap = snapshot();
    listeners.forEach((fn) => fn(snap));
  }

  function markDiscovered(id) {
    if (!state.discovered.includes(id)) state.discovered.push(id);
  }

  /** 합체(궁극체) 조건 평가 — getFusionInfo/fuse 공용 */
  function computeFusion() {
    const sp = getSpecies(state.species);
    const specialId = sp.special;
    const cur = currentForm();
    const finals = Object.entries(sp.forms)
      .filter(([, f]) => f.tier === 3)
      .map(([id, f]) => ({ id, name: f.name, discovered: state.discovered.includes(id) }));
    const allFinalsDiscovered = finals.length > 0 && finals.every((f) => f.discovered);
    const target = specialId ? sp.forms[specialId] : null;
    const atFinal = cur.tier === 3;
    const alreadySpecial = cur.tier >= 4;
    return {
      supported: !!specialId,
      atFinal,
      alreadySpecial,
      targetId: specialId,
      targetName: target ? target.name : null,
      targetColor: target ? target.color : null,
      targetMult: target ? target.mult : null,
      finals,
      allFinalsDiscovered,
      ready: !!specialId && atFinal && allFinalsDiscovered && !alreadySpecial,
    };
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

    /** 현재 형태의 고유 스킬 정의 */
    getSkill() {
      return currentForm().skill || null;
    },

    /** 도감 수집 보상 배율 (발견 형태 수 × 형태당 보너스) — 영구 */
    getCodexMultiplier() {
      return 1 + state.discovered.length * CODEX.BONUS_PER_FORM;
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

    /** 전생: 루트 형태로 회귀 (종족·도감은 유지, 정기 초기화) */
    reincarnate() {
      state.formId = getSpecies(state.species).root;
      state.essence = 0;
      markDiscovered(state.formId);
      emit();
    },

    /** 종족 선택 / 부화 (다른 알로 전환). 도감은 유지하고 새 루트를 추가. 성공 시 true */
    chooseSpecies(key) {
      if (!SPECIES[key]) return false;
      state.species = key;
      state.formId = SPECIES[key].root;
      state.essence = 0;
      markDiscovered(state.formId); // 전 종족 통합 도감이므로 기존 발견은 유지
      state.chosen = true;
      emit();
      return true;
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

    /**
     * 합체(특수 진화) 정보 — 궁극체 각성 조건.
     * 조건: 현재 최종체(tier 3) + 해당 종족 최종체 3갈래를 모두 도감에 발견.
     * (합체 아이템 소모는 호출부/economyData 가 담당해 이 모듈의 순수성을 유지)
     */
    getFusionInfo() {
      return computeFusion();
    },

    /** 합체(특수 진화) 실행 — 조건 충족 시 궁극체로. 성공하면 true (정수 소모는 호출부) */
    fuse() {
      const info = computeFusion();
      if (!info.ready) return false;
      state.formId = info.targetId;
      markDiscovered(state.formId);
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
        chosen: state.chosen,
      };
    },

    loadSaveState(s) {
      if (!s) return;
      const speciesKey = s.species && SPECIES[s.species] ? s.species : DEFAULT_SPECIES;
      const speciesForms = getSpecies(speciesKey).forms;
      state.species = speciesKey;
      state.formId = s.formId && speciesForms[s.formId] ? s.formId : getSpecies(speciesKey).root;
      state.essence = s.essence ?? 0;
      state.discovered = Array.isArray(s.discovered)
        ? s.discovered.filter(isKnownForm) // 전 종족 통합 도감 (현재 종족으로 필터하지 않음)
        : [state.formId];
      markDiscovered(state.formId);
      // 저장이 존재하면 이미 종족을 선택한 플레이어 (구버전 저장은 chosen 없음 → true 처리)
      state.chosen = s.chosen ?? true;
      emit();
    },
  };
}

/** 앱 전역에서 공유하는 싱글턴 인스턴스 */
export const evolutionData = createEvolutionData();
