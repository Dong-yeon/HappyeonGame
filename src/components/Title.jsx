import { useState } from 'react';
import { audio } from '../game/audio.js';

/** 타이틀(시작) 화면 — 최초 진입 시 표시, 탭하면 사라지며 오디오를 깨운다 */
export default function Title() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  if (!visible) return null;

  const start = () => {
    audio.unlock(); // 최초 제스처로 사운드 활성화
    setLeaving(true);
    setTimeout(() => setVisible(false), 420);
  };

  return (
    <div className={`title-screen${leaving ? ' leaving' : ''}`} onClick={start}>
      <div className="title-emblem">🐉</div>
      <h1 className="title-main">요괴록</h1>
      <div className="title-hanja">妖怪錄</div>
      <p className="title-tagline">인간을 포식하고, 정기를 모아, 승천하라</p>
      <div className="title-start">터치하여 시작</div>
      <div className="title-foot">한국 요괴 육성 방치형 · 1인 개발</div>
    </div>
  );
}
