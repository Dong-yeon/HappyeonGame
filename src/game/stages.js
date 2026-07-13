/**
 * 스테이지 정의 — 한국 삼국시대 역사 전투 배경.
 *
 * 각 스테이지는 일정 수의 적을 처치하면 보스가 등장하고, 보스를 잡으면 클리어된다.
 * 스테이지가 오를수록 적의 체력·공격력이 강해진다.
 * 정의된 목록을 넘어서면 마지막 규칙을 기준으로 무한히 강해지며 이어진다(방치형 반복 플레이).
 */
export const STAGES = [
  { name: '국경 수비', killsToClear: 8, enemyHpMul: 1.0, enemyDmgMul: 1.0, bgColor: 0x2b3a55 },
  { name: '황산벌', killsToClear: 10, enemyHpMul: 1.3, enemyDmgMul: 1.2, bgColor: 0x4a2b2b },
  { name: '살수대첩', killsToClear: 12, enemyHpMul: 1.7, enemyDmgMul: 1.4, bgColor: 0x22323a },
  { name: '안시성 혈전', killsToClear: 14, enemyHpMul: 2.2, enemyDmgMul: 1.7, bgColor: 0x2e2b3a },
  { name: '평양성 결전', killsToClear: 16, enemyHpMul: 3.0, enemyDmgMul: 2.0, bgColor: 0x1f2a1f },
];

/**
 * 스테이지 인덱스(0-base)에 해당하는 설정을 반환한다.
 * 정의된 스테이지를 넘어서면 마지막 스테이지를 기준으로 계속 강해진 값을 만들어 낸다.
 */
export function getStageConfig(index) {
  if (index < STAGES.length) {
    return { ...STAGES[index], number: index + 1 };
  }
  const last = STAGES[STAGES.length - 1];
  const extra = index - (STAGES.length - 1); // 목록을 넘어선 정도
  return {
    name: `미지의 전장`,
    killsToClear: last.killsToClear + extra * 2,
    enemyHpMul: last.enemyHpMul * Math.pow(1.25, extra),
    enemyDmgMul: last.enemyDmgMul * Math.pow(1.15, extra),
    bgColor: last.bgColor,
    number: index + 1,
  };
}
