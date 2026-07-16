import { useEffect, useState } from 'react';
import { economyData } from '../data/economyData.js';
import { fmt } from '../format.js';

/** 오프라인 보상 모달 — 재접속 시 비운 시간만큼 쌓인 골드를 보여주고 수령 */
export default function OfflineReward() {
  const [reward, setReward] = useState(economyData.getState().pendingOfflineReward);

  useEffect(
    () => economyData.subscribe((s) => setReward(s.pendingOfflineReward)),
    [],
  );

  if (!reward) return null;

  return (
    <div className="modal-backdrop">
      <div className="offline-modal">
        <div className="offline-title">⚔ 원정에서 돌아왔다</div>
        <div className="offline-sub">자리를 비운 {formatDuration(reward.seconds)} 동안</div>
        <div className="offline-gold">
          <span className="coin">◆</span> +{fmt(reward.gold)} G
        </div>
        <button className="offline-claim" onClick={() => economyData.claimOfflineReward()}>
          보상 수령
        </button>
      </div>
    </div>
  );
}

function formatDuration(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${totalSec}초`;
}
