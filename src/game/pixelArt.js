/**
 * 픽셀아트 스프라이트 생성 — 외부 에셋 없이 코드(ASCII 격자)로 Phaser 텍스처를 만든다.
 *
 * 각 격자는 문자 → 색 팔레트로 그려지며 1px/셀 텍스처가 된다.
 * config.js 의 pixelArt:true 로 확대 시 선명한 도트가 유지된다.
 */
import Phaser from 'phaser';

/** 색을 어둡게 (외곽선용) */
function darken(color, f) {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(
    Math.round(c.red * f),
    Math.round(c.green * f),
    Math.round(c.blue * f),
  );
}

/** ASCII 격자 + 팔레트로 텍스처 생성 (이미 있으면 재사용) */
export function makePixelTexture(scene, key, grid, palette) {
  if (scene.textures.exists(key)) return key;
  const w = Math.max(...grid.map((r) => r.length));
  const h = grid.length;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  for (let y = 0; y < h; y += 1) {
    const row = grid[y];
    for (let x = 0; x < row.length; x += 1) {
      const col = palette[row[x]];
      if (col == null) continue;
      g.fillStyle(col, 1);
      g.fillRect(x, y, 1, 1);
    }
  }
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

// ===== 요괴(플레이어) — 종족별 고유 도트, 형태 색으로 채색 =====
// 공통 토큰: B=몸(색), D=외곽(색 어둡게), S=음영/뿔(색 더 어둡게),
//           W=눈흰자, K=눈동자, N=검정 액센트, R=붉은 액센트, F=뼈/흰털
const SPECIES_GRIDS = {
  // 이무기 — 뿔 달린 용/뱀 (몸이 아래로 뻗음)
  imugi: [
    '....S....S....',
    '....S....S....',
    '...DBBBBBBBD..',
    '..DBBBBBBBBBD.',
    '..DBWKBBWKBBD.',
    '..DBBBBBBBBBD.',
    '..DBBBBBBBBBD.',
    '...DBBBBBBBD..',
    '....DBBBBBD...',
    '.....DBBBBD...',
    '......DBBBBD..',
    '.......DBBBD..',
    '.......DBBBD..',
    '......DBBSD...',
    '.....DBSD.....',
    '.....DD.......',
  ],
  // 구미호 — 뾰족 귀 + 꼬리
  gumiho: [
    '..S......S....',
    '.SBS....SBS...',
    '..DBBBBBBBD...',
    '.DBBBBBBBBBD..',
    '.DBWKBBWKBBD..',
    '.DBBBBBBBBBD..',
    '.DBBBBBBBBBDS.',
    '..DBBBBBBBDBS.',
    '...DBBBBBBDBS.',
    '....DBBBBDBBS.',
    '....DBBBBDBS..',
    '....DBBBBD....',
    '....DB..BD....',
    '....DB..BD....',
    '...FF..FF.....',
    '..............',
  ],
  // 도깨비 — 굵은 뿔 + 송곳니 + 몽둥이
  dokkaebi: [
    '......SS......',
    '.....SSSS.....',
    '..DBBBBBBBBD..',
    '.DBBBBBBBBBBD.',
    '.DBWKBBBBWKBD.',
    '.DBBBBBBBBBBD.',
    '.DBKBKBKBKBBD.NN',
    '.DBBBBBBBBBBDNN.',
    '..DBBBBBBBBDN..',
    '..DBBBBBBBBD...',
    '...DBBBBBBD....',
    '...DBBBBBBD....',
    '...DB....BD....',
    '..NDB....BDN...',
    '..NN......NN...',
    '..............',
  ],
  // 불가사리 — 육중한 몸통 + 작은 귀
  bulgasari: [
    '..............',
    '...S......S...',
    '..DSBBBBBBSD..',
    '.DBBBBBBBBBBD.',
    '.DBWKBBBBWKBD.',
    '.DBBBBBBBBBBD.',
    'DBBBBBBBBBBBBD',
    'DBBBBSSSSBBBBD',
    'DBBBBBBBBBBBBD',
    'DBBBBBBBBBBBBD',
    '.DBBBBBBBBBBD.',
    '.DBBBBBBBBBBD.',
    '..DBB..BBD....',
    '..DBB..BBD....',
    '..DD....DD....',
    '..............',
  ],
  // 그슨대 — 어둠 실루엣 + 붉은 눈 + 흩어지는 하단
  geuseundae: [
    '....DBBBBD....',
    '...DBBBBBBD...',
    '...DBRBBRBD...',
    '...DBBBBBBD...',
    '..DBBBBBBBBD..',
    '..DBBBBBBBBD..',
    '..DBBBBBBBBD..',
    '..DBBBBBBBBD..',
    '...NBBBBBBN...',
    '...NNBBBBNN...',
    '....NNBBNN....',
    '....N.NN.N....',
    '...N..N...N...',
    '..N...N....N..',
    '..............',
    '..............',
  ],
  // 구렁이 — 뿔 없는 뱀 (지그재그 몸통 + 붉은 혀)
  gureongi: [
    '.....DBBBD....',
    '....DBBBBBD...',
    '....DWKBWKD...',
    '....DBBBBBD...',
    '.....DBBBD.R..',
    '......DBBBD...',
    '.......DBBBD..',
    '........DBBBD.',
    '.......DBBBD..',
    '......DBBBD...',
    '.....DBBBD....',
    '....DBBBD.....',
    '...DBBBD......',
    '...DBBSD......',
    '...DBSD.......',
    '...DD.........',
  ],
  // 저승사자 — 갓 + 창백한 얼굴 + 낫
  jeoseung: [
    '.NNNNNNNNNN...',
    '....NNNN......',
    '...FFFFFF.....',
    '...FKFFKF.....',
    '...FFFFFF.....',
    '..DBBBBBBD.NN.',
    '.DBBBBBBBBDN..',
    '.DBBBBBBBBDNNN',
    '.DBBBBBBBBDN..',
    '.DBBBBBBBBDN..',
    '.DBBBBBBBBDN..',
    '..DBBBBBBD.N..',
    '..DBBBBBBD.N..',
    '..DBBBBBBD....',
    '..DB....BD....',
    '..DD....DD....',
  ],
};

function yokaiPalette(color) {
  return {
    B: color,
    D: darken(color, 0.4),
    S: darken(color, 0.62),
    W: 0xf6f6f6,
    K: 0x141414,
    N: 0x201d29,
    R: 0xe03131,
    F: 0xf3ecdb,
    '.': null,
  };
}

/** 종족·형태 색에 맞춘 요괴 텍스처 (종족+색별 캐시) */
export function getYokaiTexture(scene, speciesKey, color) {
  const grid = SPECIES_GRIDS[speciesKey] || SPECIES_GRIDS.imugi;
  const key = `yokai_${speciesKey}_${color.toString(16)}`;
  return makePixelTexture(scene, key, grid, yokaiPalette(color));
}

// ===== 인간 병사(적) — 투구/얼굴/갑주/창 =====
// H=투구, S=피부, E=눈, A=갑주, D=갑주그림자, P=창, L=신발
const SOLDIER = [
  '...HHHHHH...',
  '..HHHHHHHH..',
  '..HSSSSSSH..',
  '..SSSSSSSS..',
  '..SEESSEES..',
  '..SSSSSSSS..',
  '...AAAAAA.P.',
  '..AAAAAAAAP.',
  '..ADAAAADAP.',
  '..AAAAAAAAP.',
  '..AAAAAAAAP.',
  '...AAAAAA.P.',
  '...A....A.P.',
  '...A....A.P.',
  '..LL....LL..',
  '............',
];

export function getSoldierTexture(scene) {
  return makePixelTexture(scene, 'human_soldier', SOLDIER, {
    H: 0x545159,
    S: 0xe6b58a,
    E: 0x2b2b2b,
    A: 0xc9a26b,
    D: 0x7a5a34,
    P: 0x9c7038,
    L: 0x2e2620,
    '.': null,
  });
}

// ===== 인간 장수(보스) — 붉은 깃털 투구 + 짙은 갑주 =====
// R=깃털, H=투구, S=피부, E=눈, A=갑주, D=그림자, P=창, L=신발
const GENERAL = [
  '.....RR.......',
  '....RRRR......',
  '...HHHHHH.....',
  '..HHHHHHHH....',
  '..HSSSSSSH....',
  '..SSSSSSSS....',
  '..SEESSEES....',
  '..SSSSSSSS....',
  '..DAAAAAAD.PP.',
  '.DAAAAAAAAD PP',
  '.DAARAARAAD.PP',
  '.DAAAAAAAAD.PP',
  '.DAAAAAAAAD.PP',
  '..DAAAAAAD..PP',
  '..DA....AD..PP',
  '..LLL..LLL....',
];

export function getGeneralTexture(scene) {
  return makePixelTexture(scene, 'human_general', GENERAL, {
    R: 0xe03131,
    H: 0x3a3550,
    S: 0xe6b58a,
    E: 0x2b2b2b,
    A: 0x5f4a8a,
    D: 0x3a2e58,
    P: 0x9c7038,
    L: 0x241d2e,
    '.': null,
  });
}
