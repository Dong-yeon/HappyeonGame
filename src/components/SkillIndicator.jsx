import { useEffect, useRef, useState } from 'react';
import { skillData } from '../data/skillData.js';

/** 현재 형태의 고유 스킬 이름 + 쿨타임 바 (발동 시 리셋 → 충전) */
export default function SkillIndicator() {
  const [skill, setSkill] = useState(skillData.getState());
  const [pct, setPct] = useState(100);
  const rafRef = useRef(0);

  useEffect(() => skillData.subscribe(setSkill), []);

  // castSeq 변할 때마다 0→100% 로 쿨타임 충전 애니메이션
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = () => {
      const p = Math.min(100, ((performance.now() - start) / skill.cooldown) * 100);
      setPct(p);
      if (p < 100) rafRef.current = requestAnimationFrame(tick);
    };
    setPct(0);
    tick();
    return () => cancelAnimationFrame(rafRef.current);
  }, [skill.castSeq, skill.cooldown]);

  if (!skill.name) return null;
  const ready = pct >= 100;

  return (
    <div className="skill">
      <div className="skill-head">
        <span className="skill-dot" style={{ background: skill.color }} />
        <span className="skill-name" style={{ color: skill.color }}>
          {skill.name}
        </span>
        <span className="skill-state">{ready ? '준비' : '충전'}</span>
      </div>
      <div className="bar skill-bar">
        <div
          className="bar-fill"
          style={{ width: `${pct}%`, background: skill.color, opacity: ready ? 1 : 0.7 }}
        />
      </div>
    </div>
  );
}
