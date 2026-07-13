/**
 * 요괴 종족 정의 — 각 요괴는 고유한 진화 라인(forms)을 가진다.
 *
 * 인간을 포식해 모은 "정기"로 다음 단계로 진화하고, 진화할수록 능력치 배율이 커진다.
 * 마지막 단계 도달 = 승천(예: 용).
 *
 * 새 요괴를 추가하려면 여기에 항목만 넣으면 된다 (종족 선택 UI 는 추후).
 *
 * forms[].essenceToEvolve: 다음 단계로 진화에 필요한 정기 (마지막 단계는 null = 승천 완료)
 * forms[].mult:            해당 단계의 능력치 배율
 * forms[].color:           임시 스프라이트 색 (실제 스프라이트로 교체 예정)
 */
export const SPECIES = {
  imugi: {
    name: '이무기',
    forms: [
      { name: '새끼 이무기', color: 0x2f9e44, essenceToEvolve: 120, mult: 1.0 },
      { name: '이무기', color: 0x1f8f6f, essenceToEvolve: 400, mult: 1.9 },
      { name: '용', color: 0x4dd4c4, essenceToEvolve: null, mult: 3.4 }, // 승천
    ],
  },
  gumiho: {
    name: '구미호',
    forms: [
      { name: '여우', color: 0xf59f00, essenceToEvolve: 120, mult: 1.0 },
      { name: '구미호', color: 0xff8787, essenceToEvolve: 400, mult: 1.9 },
      { name: '천호', color: 0xffe066, essenceToEvolve: null, mult: 3.4 }, // 승천
    ],
  },
};

/** 기본 시작 종족 */
export const DEFAULT_SPECIES = 'imugi';

export function getForms(speciesKey) {
  return (SPECIES[speciesKey] ?? SPECIES[DEFAULT_SPECIES]).forms;
}
