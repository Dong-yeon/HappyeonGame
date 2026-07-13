import { useEffect, useState } from 'react';
import { evolutionData } from '../data/evolutionData.js';
import { rebirthData } from '../data/rebirthData.js';
import { stageData } from '../data/stageData.js';
import { playerData } from '../data/playerData.js';
import { careData } from '../data/careData.js';

/**
 * 전생(환생) 패널 — 최종 진화(승천) 도달 시 하단 중앙에 나타난다.
 * 전생하면 형태·스테이지·레벨·훈련이 초기화되고, 영구 배율을 얻는다 (도감·골드는 유지).
 */
export default function Rebirth() {
  const [evo, setEvo] = useState(evolutionData.getState());
  const [rb, setRb] = useState(rebirthData.getState());
  const [confirm, setConfirm] = useState(false);

  useEffect(() => evolutionData.subscribe(setEvo), []);
  useEffect(() => rebirthData.subscribe(setRb), []);

  if (!evo.isFinal) return null;

  function doRebirth() {
    // 오케스트레이션: 형태/스테이지/훈련/레벨 초기화 후 전생 횟수 증가
    evolutionData.reincarnate();
    stageData.reset();
    careData.reset();
    playerData.rebirthReset();
    rebirthData.addRebirth(); // 마지막: 씬이 전생 연출을 띄운다
    setConfirm(false);
  }

  return (
    <div className="rebirth">
      {!confirm ? (
        <button className="rebirth-btn" onClick={() => setConfirm(true)}>
          🔄 전생하기
          <span className="rebirth-sub">
            {rb.count > 0 ? `환생 ${rb.count}회 · 배율 ×${rb.multiplier}` : '영구 배율 획득'}
          </span>
        </button>
      ) : (
        <div className="rebirth-confirm">
          <div className="rebirth-q">전생하시겠습니까?</div>
          <div className="rebirth-detail">
            형태·스테이지·레벨·훈련 <b>초기화</b> · 영구 배율 <b>×{rb.nextMultiplier}</b> 획득
            <br />
            <span className="rebirth-keep">(도감 · 골드 · 업그레이드는 유지)</span>
          </div>
          <div className="rebirth-actions">
            <button className="rebirth-yes" onClick={doRebirth}>
              전생
            </button>
            <button className="rebirth-no" onClick={() => setConfirm(false)}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
