import { useEffect, useState } from 'react';
import { retentionData } from '../data/retentionData.js';
import { economyData } from '../data/economyData.js';
import { evolutionData } from '../data/evolutionData.js';
import { fmt } from '../format.js';

/** 보상 객체 → 읽기 좋은 문자열 */
function rewardText(r) {
  if (!r) return '';
  const parts = [];
  if (r.gold) parts.push(`${fmt(r.gold)} G`);
  if (r.materials) parts.push(`재료 ${fmt(r.materials)}`);
  if (r.essence) parts.push(`정기 ${fmt(r.essence)}`);
  return parts.join(' · ');
}

/** 보상 지급 (retention 은 순수 모듈이므로 지급은 여기서 처리) */
function grant(r) {
  if (!r) return;
  if (r.gold) economyData.gainGold(r.gold);
  if (r.materials) economyData.gainMaterials(r.materials);
  if (r.essence) evolutionData.gainEssence(r.essence);
}

/** 리텐션 패널 — 일일 미션 / 업적 / 출석 보상 (탭 전환) */
export default function Retention() {
  const [st, setSt] = useState(retentionData.getState());
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('daily');

  useEffect(() => retentionData.subscribe(setSt), []);

  const att = st.attendance;

  return (
    <div className="retention">
      <button className="ret-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="ret-toggle-icon">📅</span>
        <span className="ret-toggle-label">일일 · 도전</span>
        {st.claimable > 0 && <span className="ret-badge">{st.claimable}</span>}
        <span className="ret-toggle-caret">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="ret-panel">
          <div className="ret-tabs">
            <button className={`ret-tab${tab === 'daily' ? ' on' : ''}`} onClick={() => setTab('daily')}>
              일일 미션
            </button>
            <button className={`ret-tab${tab === 'ach' ? ' on' : ''}`} onClick={() => setTab('ach')}>
              업적
            </button>
            <button className={`ret-tab${tab === 'att' ? ' on' : ''}`} onClick={() => setTab('att')}>
              출석
            </button>
          </div>

          {/* ===== 일일 미션 ===== */}
          {tab === 'daily' && (
            <div className="ret-list">
              {st.missions.map((m) => (
                <div className={`ret-row${m.claimed ? ' done' : ''}`} key={m.id}>
                  <div className="ret-row-main">
                    <span className="ret-row-name">{m.name}</span>
                    <span className="ret-row-reward">🎁 {rewardText(m.reward)}</span>
                    <div className="ret-bar">
                      <div className="ret-bar-fill" style={{ width: `${(m.progress / m.goal) * 100}%` }} />
                    </div>
                    <span className="ret-row-prog">
                      {fmt(m.progress)} / {fmt(m.goal)}
                    </span>
                  </div>
                  <button
                    className="ret-claim"
                    disabled={!m.claimable}
                    onClick={() => grant(retentionData.claimMission(m.id))}
                  >
                    {m.claimed ? '완료' : m.done ? '수령' : '진행'}
                  </button>
                </div>
              ))}
              <div className="ret-hint">미션은 매일 0시에 갱신됩니다.</div>
            </div>
          )}

          {/* ===== 업적 ===== */}
          {tab === 'ach' && (
            <div className="ret-list ret-scroll">
              {st.achievements.map((a) => (
                <div className={`ret-row${a.claimed ? ' done' : ''}`} key={a.id}>
                  <div className="ret-row-main">
                    <span className="ret-row-name">
                      {a.name} <span className="ret-row-desc">· {a.desc}</span>
                    </span>
                    <span className="ret-row-reward">🎁 {rewardText(a.reward)}</span>
                    <div className="ret-bar">
                      <div className="ret-bar-fill" style={{ width: `${(a.current / a.goal) * 100}%` }} />
                    </div>
                    <span className="ret-row-prog">
                      {fmt(a.current)} / {fmt(a.goal)}
                    </span>
                  </div>
                  <button
                    className="ret-claim"
                    disabled={!a.claimable}
                    onClick={() => grant(retentionData.claimAchievement(a.id))}
                  >
                    {a.claimed ? '완료' : a.done ? '수령' : '진행'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ===== 출석 ===== */}
          {tab === 'att' && (
            <div className="ret-att">
              <div className="ret-att-head">
                연속 출석 <b>{att.streak}</b>일 · 누적 <b>{att.totalDays}</b>일
              </div>
              <div className="ret-att-cycle">
                {att.cycle.map((r, i) => {
                  const dayNo = i + 1;
                  const claimedDay = dayNo < att.nextCycleDay || (!att.canClaim && dayNo === att.nextCycleDay);
                  const isNext = att.canClaim && dayNo === att.nextCycleDay;
                  return (
                    <div className={`ret-att-day${claimedDay ? ' got' : ''}${isNext ? ' next' : ''}`} key={i}>
                      <span className="ret-att-daynum">{dayNo}일</span>
                      <span className="ret-att-daygift">{rewardText(r)}</span>
                    </div>
                  );
                })}
              </div>
              <button
                className="ret-att-claim"
                disabled={!att.canClaim}
                onClick={() => grant(retentionData.claimAttendance())}
              >
                {att.canClaim ? `오늘 출석 보상 받기 (${rewardText(att.nextReward)})` : '오늘 출석 완료 ✓'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
