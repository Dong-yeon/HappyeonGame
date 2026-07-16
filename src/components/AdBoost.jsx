import { useEffect, useState } from 'react';
import { adData } from '../data/adData.js';
import { AD } from '../game/constants.js';

function mmss(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${`${s % 60}`.padStart(2, '0')}`;
}

/** 정기 부스트 — 광고 시청으로 일정 시간 정기 획득 ×2 (쿨다운). 상단 중앙 알약 버튼. */
export default function AdBoost() {
  const [st, setSt] = useState(adData.getState());

  useEffect(() => adData.subscribe(setSt), []);
  // 카운트다운 갱신 (부스트/쿨다운 남은 시간 표시)
  useEffect(() => {
    const id = setInterval(() => setSt(adData.getState()), 500);
    return () => clearInterval(id);
  }, []);

  const boostMult = AD.ESSENCE_BOOST_MULT;

  if (st.essenceBoostActive) {
    return (
      <div className="adboost active">
        <span className="adboost-icon">⚡</span>
        정기 ×{boostMult} · {mmss(st.essenceBoostRemaining)}
      </div>
    );
  }

  if (st.essenceCooldownRemaining > 0) {
    return (
      <div className="adboost cooldown">
        <span className="adboost-icon">⏳</span>
        정기 부스트 재충전 {mmss(st.essenceCooldownRemaining)}
      </div>
    );
  }

  return (
    <button
      className="adboost ready"
      disabled={st.watching}
      onClick={async () => {
        const ok = await adData.watch();
        if (ok) adData.activateEssenceBoost();
      }}
    >
      📺 정기 ×{boostMult} 부스트 (광고)
    </button>
  );
}
