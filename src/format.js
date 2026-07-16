/**
 * 큰 숫자 축약 — 방치형 후반의 거대 수치를 K/M/B/T… 로 표기.
 *
 * 1000 미만은 정수 그대로, 이상은 3 유효숫자 + 단위.
 * 단위 배열을 넘어서면 letter-pair(aa, ab, …)로 무한 확장.
 * tier 는 log10 기반(작은 epsilon 으로 경계 부동소수 오차 보정) — 1e21 이상에서도 안전.
 */
const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function fmt(n) {
  if (n == null || Number.isNaN(n) || !Number.isFinite(n)) return '0';
  const neg = n < 0;
  const x = Math.abs(n);
  if (x < 1000) return (neg ? '-' : '') + Math.floor(x).toString();

  const tier = Math.floor((Math.log10(x) + 1e-9) / 3);

  let unit;
  if (tier < UNITS.length) {
    unit = UNITS[tier];
  } else {
    const t = tier - UNITS.length;
    unit = String.fromCharCode(97 + Math.floor(t / 26)) + String.fromCharCode(97 + (t % 26));
  }

  const scaled = x / 1000 ** tier;
  let s;
  if (scaled < 10) s = scaled.toFixed(2);
  else if (scaled < 100) s = scaled.toFixed(1);
  else s = Math.floor(scaled).toString();
  if (s.includes('.')) s = s.replace(/\.?0+$/, ''); // 1.20→1.2, 1.00→1

  return (neg ? '-' : '') + s + unit;
}
