import { useEffect, useState } from 'react';
import { economyData } from '../data/economyData.js';

/** 업그레이드 상점 — 골드로 스탯 강화 (열고 닫는 패널) */
export default function Shop() {
  const [eco, setEco] = useState(economyData.getState());
  const [open, setOpen] = useState(false);

  useEffect(() => economyData.subscribe(setEco), []);

  const upgrades = economyData.getUpgradeList();

  return (
    <div className="shop">
      <button className="shop-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="coin">◆</span> {eco.gold.toLocaleString()} G
        <span className="shop-toggle-label">{open ? '▲ 상점' : '▼ 상점'}</span>
      </button>

      {open && (
        <div className="shop-panel">
          <div className="shop-title">업그레이드 상점</div>
          {upgrades.map((u) => (
            <div className="shop-item" key={u.key}>
              <div className="shop-item-info">
                <span className="shop-item-name">
                  {u.name} <span className="shop-item-lv">Lv.{u.level}</span>
                </span>
                <span className="shop-item-effect">
                  {u.effect} → <b>{u.nextEffect}</b>
                </span>
              </div>
              <button
                className="shop-buy"
                disabled={!u.affordable}
                onClick={() => economyData.buyUpgrade(u.key)}
              >
                ◆ {u.cost.toLocaleString()}
              </button>
            </div>
          ))}
          <div className="shop-hint">골드는 적·보스 처치로 획득됩니다.</div>
        </div>
      )}
    </div>
  );
}
