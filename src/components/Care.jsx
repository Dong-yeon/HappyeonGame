import { useEffect, useState } from 'react';
import { careData } from '../data/careData.js';
import { economyData } from '../data/economyData.js';
import { CARE } from '../game/constants.js';

/**
 * 육성(케어) 패널 — 먹이 / 훈련 / 컨디션.
 * 먹이로 포만감을 채우고, 포만감을 소모해 공격/체력 훈련 → 진화 갈래를 결정한다.
 */
export default function Care() {
  const [care, setCare] = useState(careData.getState());
  const [gold, setGold] = useState(economyData.getState().gold);
  const [open, setOpen] = useState(false);

  useEffect(() => careData.subscribe(setCare), []);
  useEffect(() => economyData.subscribe((s) => setGold(s.gold)), []);

  // 포만감은 시간이 지나면 감소 → 주기적으로 갱신
  useEffect(() => {
    const id = setInterval(() => careData.tick(), 3000);
    return () => clearInterval(id);
  }, []);

  const fullnessPct = (care.fullness / care.maxFullness) * 100;
  const canFeed = gold >= CARE.FEED_COST;

  function feed() {
    if (economyData.spendGold(CARE.FEED_COST)) careData.feed();
  }

  return (
    <div className="care">
      <button className="care-toggle" onClick={() => setOpen((v) => !v)}>
        🍖 육성 · {care.condition}
        <span className="care-toggle-label">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="care-panel">
          <div className="care-row">
            <span className="care-label">포만감</span>
            <div className="bar care-bar">
              <div
                className={`bar-fill care${care.starving ? ' starving' : ''}`}
                style={{ width: `${fullnessPct}%` }}
              />
              <span className="bar-label">
                {care.fullness} / {care.maxFullness}
              </span>
            </div>
          </div>

          <button className="care-btn feed" disabled={!canFeed} onClick={feed}>
            🍖 먹이 주기 <span className="care-btn-sub">◆{CARE.FEED_COST} · +{CARE.FEED_AMOUNT}</span>
          </button>

          <div className="care-train">
            <button
              className="care-btn train"
              disabled={!care.canTrain}
              onClick={() => careData.train('attack')}
            >
              ⚔ 공격 훈련
              <span className="care-btn-sub">Lv.{care.training.attack}</span>
            </button>
            <button
              className="care-btn train"
              disabled={!care.canTrain}
              onClick={() => careData.train('hp')}
            >
              🛡 체력 훈련
              <span className="care-btn-sub">Lv.{care.training.hp}</span>
            </button>
          </div>

          <div className="care-hint">
            {care.starving
              ? '⚠ 탈진! 성장 효율이 떨어집니다. 먹이를 주세요.'
              : `훈련 방향이 진화 갈래를 결정합니다 (현재: ${dominantLabel(care.dominant)})`}
          </div>
        </div>
      )}
    </div>
  );
}

function dominantLabel(d) {
  if (d === 'attack') return '공격형';
  if (d === 'hp') return '체력형';
  return '균형';
}
