import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';

/** Phaser 게임 설정 생성 (parent: 게임을 마운트할 DOM 요소) */
export function createGameConfig(parent) {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#2b3a55', // 밤하늘 느낌의 남색
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 900 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene],
  };
}
