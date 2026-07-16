import { useEffect, useState } from 'react';
import { audio } from '../game/audio.js';
import { saveManager } from '../data/saveManager.js';

const VERSION = '1.0.0';

/** 설정 — 우하단 코너(음소거 + 톱니) + 설정 모달(사운드/저장 초기화/게임 정보) */
export default function Settings() {
  const [snd, setSnd] = useState(audio.getState());
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => audio.subscribe(setSnd), []);

  const mode = saveManager.getMode();

  return (
    <>
      <div className="audio-ctl">
        <button
          className="audio-btn"
          title={snd.muted ? '음소거 해제' : '음소거'}
          onClick={() => audio.toggleMute()}
        >
          {snd.muted ? '🔇' : '🔊'}
        </button>
        <button className="audio-btn" title="설정" onClick={() => setOpen(true)}>
          ⚙
        </button>
      </div>

      {open && (
        <div className="settings-backdrop" onClick={() => setOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-title">⚙ 설정</div>

            {/* ===== 사운드 ===== */}
            <div className="settings-section">
              <div className="settings-label">사운드</div>
              <div className="settings-row">
                <button className="settings-toggle" onClick={() => audio.toggleMute()}>
                  {snd.muted ? '🔇 음소거 켜짐' : '🔊 소리 켜짐'}
                </button>
              </div>
              <div className="settings-row">
                <span className="settings-sub">볼륨</span>
                <input
                  className="settings-vol"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(snd.volume * 100)}
                  onChange={(e) => audio.setVolume(Number(e.target.value) / 100)}
                />
                <span className="settings-volnum">{Math.round(snd.volume * 100)}</span>
              </div>
            </div>

            {/* ===== 저장 ===== */}
            <div className="settings-section">
              <div className="settings-label">저장</div>
              <div className="settings-sub settings-mode">
                방식: {mode === 'server' ? '서버 연동' : '로컬 저장(브라우저)'}
              </div>
              {!confirmReset ? (
                <button className="settings-reset" onClick={() => setConfirmReset(true)}>
                  저장 데이터 초기화
                </button>
              ) : (
                <div className="settings-confirm">
                  <div className="settings-warn">정말 초기화할까요? 모든 진행이 사라지며 되돌릴 수 없습니다.</div>
                  <div className="settings-confirm-row">
                    <button className="settings-reset danger" onClick={() => saveManager.resetAll()}>
                      초기화
                    </button>
                    <button className="settings-cancel" onClick={() => setConfirmReset(false)}>
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ===== 정보 ===== */}
            <div className="settings-section">
              <div className="settings-label">정보</div>
              <div className="settings-sub">
                요괴록 (妖怪錄) · v{VERSION}
              </div>
              <div className="settings-credit">한국 요괴 육성 방치형 게임 · 1인 개발</div>
              <div className="settings-credit">도트·사운드는 코드로 생성 (외부 에셋 없음)</div>
            </div>

            <button className="settings-close" onClick={() => setOpen(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
