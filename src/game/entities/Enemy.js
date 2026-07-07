import Phaser from 'phaser';
import { ENEMY } from '../constants.js';

/**
 * 기본 적 — 왼쪽으로 걸어오는 단순 적
 * 임시 스프라이트: 빨간 사각형
 */
export default class Enemy extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y) {
    super(scene, x, y, ENEMY.WIDTH, ENEMY.HEIGHT, ENEMY.COLOR);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = ENEMY.HP;
    this.maxHp = ENEMY.HP;

    // 머리 위 HP바
    this.hpBar = scene.add.rectangle(x, y - ENEMY.HEIGHT / 2 - 8, ENEMY.WIDTH, 4, 0x2ecc71);
  }

  update() {
    this.body.setVelocityX(ENEMY.MOVE_SPEED);
    this.hpBar.setPosition(this.x, this.y - ENEMY.HEIGHT / 2 - 8);
    this.hpBar.width = ENEMY.WIDTH * (this.hp / this.maxHp);
  }

  takeDamage(amount) {
    this.hp -= amount;

    // 피격 플래시
    this.setFillStyle(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.setFillStyle(ENEMY.COLOR);
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.scene.events.emit('enemy-killed', { exp: ENEMY.EXP_REWARD, x: this.x, y: this.y });
    this.hpBar.destroy();
    this.destroy();
  }

  destroy(fromScene) {
    if (this.hpBar && this.hpBar.active) this.hpBar.destroy();
    super.destroy(fromScene);
  }
}
