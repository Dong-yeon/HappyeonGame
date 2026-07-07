import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from './config.js';

/** Phaser 게임을 React 컴포넌트로 감싸는 래퍼 */
export default function PhaserGame() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    // React StrictMode의 이중 마운트 대비
    if (gameRef.current) return;
    gameRef.current = new Phaser.Game(createGameConfig(containerRef.current));

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="phaser-mount" />;
}
