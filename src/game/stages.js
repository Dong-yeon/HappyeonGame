/**
 * 스테이지 정의 — 요괴의 인간 세계 침공.
 *
 * 난이도(적 체력·공격력 배율, 처치 목표)는 아래 곡선을 따른다.
 * 이름/배경은 챕터 내 스테이지 위치(1~10)로 정해져, 챕터마다 동일한 관문 순서를 밟는다.
 * 스테이지가 오를수록 강해지며, 정의된 곡선을 넘어서면 마지막 값을 기준으로 무한히 강해진다.
 */
import { CHAPTER } from './constants.js';

// 난이도 곡선 (앞 5개는 완만, 이후 무한 스케일링) — 밸런스 검증된 값
const CURVE = [
  { killsToClear: 8, enemyHpMul: 1.0, enemyDmgMul: 1.0 },
  { killsToClear: 10, enemyHpMul: 1.3, enemyDmgMul: 1.2 },
  { killsToClear: 12, enemyHpMul: 1.7, enemyDmgMul: 1.4 },
  { killsToClear: 14, enemyHpMul: 2.2, enemyDmgMul: 1.7 },
  { killsToClear: 16, enemyHpMul: 3.0, enemyDmgMul: 2.0 },
];

// 챕터 내 스테이지(1~10)별 이름/배경 — 인간 세계 깊숙이 침공하는 흐름
const STAGE_NAMES = [
  '갯마을 습격',
  '산성 관문',
  '관군 토벌대',
  '성읍 침공',
  '도성 외곽',
  '도성 성벽',
  '왕궁 앞뜰',
  '왕궁 대전',
  '금군 방어선',
  '천계의 문', // 챕터 보스 관문
];
const STAGE_BG = [
  0x22323a, 0x2b3a2b, 0x3a3222, 0x4a2b2b, 0x2e2b3a, 0x3a2b3a, 0x2b2b4a, 0x22223a, 0x2a2233, 0x1f2333,
];

/**
 * 챕터별 배경 테마 — 챕터가 오를수록 무드가 바뀐다(테마 수를 넘으면 순환).
 * skyTop/skyBottom: 하늘 그라데이션, moon/moonGlow: 달, mountains[3]: 산 3겹(원경→근경), fog, spirits[]: 도깨비불 색
 */
export const CHAPTER_THEMES = [
  { // 1 — 첫 밤 (남색 갯마을)
    skyTop: 0x2b3a55, skyBottom: 0x151d2e, moon: 0xfdf6d8, moonGlow: 0xfff3bf,
    mountains: [0x2b3352, 0x1e2540, 0x141a30], fog: 0x39456e, spirits: [0x74e0c0, 0x9ad0ff, 0xc9b6ff, 0xa8e6a0],
  },
  { // 2 — 보랏빛 황혼 (성읍)
    skyTop: 0x3a2a55, skyBottom: 0x191024, moon: 0xffe0b0, moonGlow: 0xffd0a0,
    mountains: [0x40305c, 0x2c2244, 0x1c1630], fog: 0x4a3a66, spirits: [0xffb0e0, 0xc9a0ff, 0xffc98a],
  },
  { // 3 — 혈월 (붉은 달·도성 결전)
    skyTop: 0x40202a, skyBottom: 0x180c10, moon: 0xff9a7a, moonGlow: 0xff6b5a,
    mountains: [0x4a2530, 0x331a22, 0x1e0f14], fog: 0x5a2a34, spirits: [0xff8a6a, 0xffb08a, 0xff6b6b],
  },
  { // 4 — 청록 요기 (음산한 숲)
    skyTop: 0x1a3a38, skyBottom: 0x0d1c1a, moon: 0xd8f0e0, moonGlow: 0xa0f0d0,
    mountains: [0x1f4a44, 0x143430, 0x0c201e], fog: 0x2a5a52, spirits: [0x74e0c0, 0x9affd0, 0x74ffb0],
  },
  { // 5 — 서리 밤 (차가운 청백)
    skyTop: 0x2a3a52, skyBottom: 0x131d2c, moon: 0xeaf4ff, moonGlow: 0xc0e0ff,
    mountains: [0x33455e, 0x24354a, 0x172436], fog: 0x4a6280, spirits: [0xbfe6ff, 0xe0f0ff, 0xa0d0ff],
  },
  { // 6 — 금빛 천계 (승천·천계의 문)
    skyTop: 0x3a3050, skyBottom: 0x191322, moon: 0xfff0b0, moonGlow: 0xffe066,
    mountains: [0x453a5c, 0x2e2644, 0x1c1730], fog: 0x5a4a70, spirits: [0xffe066, 0xffd0a0, 0xd0b0ff],
  },
];

/** 하위 호환용 (일부 코드가 STAGES.length 등을 참조할 수 있어 유지) */
export const STAGES = CURVE;

/**
 * 스테이지 인덱스(0-base)에 해당하는 설정을 반환한다.
 * 난이도는 CURVE(+무한 스케일링), 이름/배경은 챕터 내 위치(index % 10) 기준.
 */
export function getStageConfig(index) {
  let killsToClear;
  let enemyHpMul;
  let enemyDmgMul;
  if (index < CURVE.length) {
    ({ killsToClear, enemyHpMul, enemyDmgMul } = CURVE[index]);
  } else {
    const last = CURVE[CURVE.length - 1];
    const extra = index - (CURVE.length - 1); // 목록을 넘어선 정도
    killsToClear = last.killsToClear + extra * 2;
    enemyHpMul = last.enemyHpMul * Math.pow(1.35, extra); // 후반 체력 급증 → 파워 성장(전생/재료) 유도
    enemyDmgMul = last.enemyDmgMul * Math.pow(1.2, extra);
  }
  // 챕터2+ 적 피해 소폭 완화 (체력·처치목표는 그대로 → 진행 속도는 유지, 생존만 숨통)
  if (Math.floor(index / CHAPTER.SIZE) + 1 >= 2) enemyDmgMul *= CHAPTER.DMG_DAMPEN;

  const local = index % 10; // 챕터 내 스테이지(0~9)
  return {
    name: STAGE_NAMES[local],
    bgColor: STAGE_BG[local],
    killsToClear,
    enemyHpMul,
    enemyDmgMul,
    number: index + 1,
  };
}
