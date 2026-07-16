import { useEffect, useState } from 'react';
import { expeditionData } from '../data/expeditionData.js';
import { retentionData } from '../data/retentionData.js';
import { economyData } from '../data/economyData.js';

/**
 * 원정 패널 — 비활성 요괴를 원정 보내 재료 수급 + 재료 제단(영구 강화).
 * 원정 재료는 시간에 따라 누적되므로 주기적으로 표시를 갱신한다.
 */
export default function Expedition() {
  const [, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const [materials, setMaterials] = useState(economyData.getState().materials);

  useEffect(() => expeditionData.subscribe(() => setTick((t) => t + 1)), []);
  useEffect(() => economyData.subscribe((s) => setMaterials(s.materials)), []);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const list = expeditionData.getExpeditions();
  const altar = expeditionData.getAltarInfo();
  const skill = expeditionData.getSkillInfo();
  const boost = expeditionData.getEssenceBoostInfo();
  const unlocked = list.filter((x) => x.unlocked);
  const lockedCount = list.filter((x) => !x.unlocked).length;

  return (
    <div className="expedition">
      <button className="exped-toggle" onClick={() => setOpen((v) => !v)}>
        🧭 원정 · 재료 {materials.toLocaleString()}
        <span className="exped-toggle-label">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="exped-panel">
          <div className="exped-title">🏛 재료 제단</div>
          <div className="exped-altar">
            <div className="exped-item-info">
              <span className="exped-item-name">
                능력 강화 <b>Lv.{altar.level}</b>
              </span>
              <span className="exped-item-rate">
                영구 능력 +{altar.bonusPct}% → <b>+{altar.nextBonusPct}%</b>
              </span>
            </div>
            <button className="exped-btn altar" disabled={materials < altar.cost} onClick={() => expeditionData.upgradeAltar()}>
              🪵 {altar.cost}
            </button>
          </div>
          <div className="exped-altar">
            <div className="exped-item-info">
              <span className="exped-item-name">
                스킬 강화 <b>Lv.{skill.level}</b>
              </span>
              <span className="exped-item-rate">
                스킬 피해 +{skill.bonusPct}% → <b>+{skill.nextBonusPct}%</b>
              </span>
            </div>
            <button className="exped-btn altar" disabled={materials < skill.cost} onClick={() => expeditionData.upgradeSkill()}>
              🪵 {skill.cost}
            </button>
          </div>
          <div className="exped-altar">
            <div className="exped-item-info">
              <span className="exped-item-name">정기 촉진</span>
              <span className="exped-item-rate">
                {boost.available ? <>재료 → 정기 <b>+{boost.amount}</b></> : '최종 형태 (진화 없음)'}
              </span>
            </div>
            <button
              className="exped-btn altar"
              disabled={!boost.available || materials < boost.cost}
              onClick={() => expeditionData.boostEssence()}
            >
              🪵 {boost.cost}
            </button>
          </div>

          <div className="exped-title">🧭 원정 (비활성 요괴)</div>
          {unlocked.length === 0 && (
            <div className="exped-hint">부화로 다른 요괴를 키우면 원정 보낼 수 있습니다.</div>
          )}
          {unlocked.map((x) => (
            <div className="exped-item" key={x.key}>
              <div className="exped-item-info">
                <span className="exped-item-name">
                  {x.name} <span className="exped-item-found">{x.found}/{x.total}</span>
                </span>
                <span className="exped-item-rate">
                  {x.rate.toFixed(1)} 재료/분{x.on ? ` · 대기 ${x.pending}` : ''}
                </span>
              </div>
              {x.on ? (
                <div className="exped-actions">
                  <button className="exped-btn collect" onClick={() => expeditionData.collect(x.key)}>
                    수령
                  </button>
                  <button className="exped-btn recall" onClick={() => expeditionData.recall(x.key)}>
                    복귀
                  </button>
                </div>
              ) : (
                <button
                  className="exped-btn send"
                  onClick={() => {
                    if (expeditionData.send(x.key)) retentionData.recordExpedition();
                  }}
                >
                  파견
                </button>
              )}
            </div>
          ))}
          {lockedCount > 0 && (
            <div className="exped-hint">미발견 요괴 {lockedCount}종 — 부화·육성으로 해금</div>
          )}
        </div>
      )}
    </div>
  );
}
