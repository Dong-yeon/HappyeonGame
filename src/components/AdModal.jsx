import { useEffect, useState } from 'react';
import { adData } from '../data/adData.js';

/** 광고 시청 중 오버레이 (시뮬레이션). 실제 SDK 연동 시 전면 광고가 이 자리를 대체한다. */
export default function AdModal() {
  const [st, setSt] = useState(adData.getState());
  useEffect(() => adData.subscribe(setSt), []);

  if (!st.watching) return null;

  return (
    <div className="ad-backdrop">
      <div className="ad-modal">
        <div className="ad-badge">📺 AD</div>
        <div className="ad-text">광고 시청 중…</div>
        <div className="ad-bar">
          <div className="ad-bar-fill" />
        </div>
        <div className="ad-note">시청 완료 시 보상이 지급됩니다</div>
      </div>
    </div>
  );
}
