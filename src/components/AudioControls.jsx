import { useEffect, useState } from 'react';
import { audio } from '../game/audio.js';

/** 사운드 설정 — 음소거 토글 + 볼륨 슬라이더 (좌하단 플로팅) */
export default function AudioControls() {
  const [st, setSt] = useState(audio.getState());
  const [open, setOpen] = useState(false);

  useEffect(() => audio.subscribe(setSt), []);

  return (
    <div className={`audio-ctl ${open ? 'open' : ''}`}>
      <button
        className="audio-btn"
        title={st.muted ? '음소거 해제' : '음소거'}
        onClick={() => audio.toggleMute()}
      >
        {st.muted ? '🔇' : '🔊'}
      </button>
      <button
        className="audio-btn audio-gear"
        title="볼륨"
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>
      {open && (
        <input
          className="audio-vol"
          type="range"
          min="0"
          max="100"
          value={Math.round(st.volume * 100)}
          onChange={(e) => audio.setVolume(Number(e.target.value) / 100)}
          aria-label="볼륨"
        />
      )}
    </div>
  );
}
