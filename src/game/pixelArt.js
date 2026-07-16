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

// ===== 요괴(플레이어) — 형태 색으로 몸을 칠하고 뿔/눈을 얹은 도트 =====
// B=몸, D=외곽, H=뿔, W=눈흰자, K=눈동자
const YOKAI = [
  '...D......D...',
  '..DHD....DHD..',
  '..DHD....DHD..',
  '...DBBBBBBD...',
  '..DBBBBBBBBD..',
  '.DBBBBBBBBBBD.',
  '.DBWKBBBBWKBD.',
  '.DBWWBBBBWWBD.',
  '.DBBBBBBBBBBD.',
  '.DBBBDDDDBBBD.',
  '.DBBBBBBBBBBD.',
  '..DBBBBBBBBD..',
  '..DBBBBBBBBD..',
  '..DBBBBBBBBD..',
  '..DB.DDDD.BD..',
  '..DD......DD..',
];

/** 형태 색에 맞춘 요괴 텍스처 (색별 캐시) */
export function getYokaiTexture(scene, color) {
  const key = `yokai_${color.toString(16)}`;
  return makePixelTexture(scene, key, YOKAI, {
    B: color,
    D: darken(color, 0.4),
    H: darken(color, 0.28),
    W: 0xf6f6f6,
    K: 0x141414,
    '.': null,
  });
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
