import { useEffect, useState } from 'react';
import { evolutionData } from '../data/evolutionData.js';

/** 진화 버튼 — 정기가 충분히 모이면 화면 하단 중앙에 나타나 진화(승천)를 실행 */
export default function Evolve() {
  const [evo, setEvo] = useState(evolutionData.getState());

  useEffect(() => evolutionData.subscribe(setEvo), []);

  if (!evo.canEvolve) return null;

  const nextIsFinal = evo.formIndex + 1 >= 2; // 마지막 단계 진입이면 승천 문구
  return (
    <div className="evolve">
      <button className="evolve-btn" onClick={() => evolutionData.evolve()}>
        <span className="evolve-spark">✦</span>
        {nextIsFinal ? '승천하기' : '진화하기'}
        <span className="evolve-sub">정기 충만</span>
      </button>
    </div>
  );
}
