import Phaser from 'phaser';
import { ENEMY } from '../constants.js';

/**
 * 적 — 맵 안을 좌우로 배회하는 단순 적 (벽/플랫폼 끝에서 방향 전환)
 * 옵션으로 체력·공격력·크기·색을 조정해 보스로도 사용한다.
 * 임시 스프라이트: 빨간(보스는 보라) 사각형
 */
export default class Enemy extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, opts = {}) {
    const width = opts.width ?? ENEMY.WIDTH;
    const height = opts.height ?? ENEMY.HEIGHT;
    const color = opts.color ?? ENEMY.COLOR;
    super(scene, x, y, width, height, color);
    this.baseColor = color;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);

    this.hp = opts.hp ?? ENEMY.HP;
    this.maxHp = this.hp;
    this.damage = opts.damage ?? ENEMY.DAMAGE;
    this.expReward = opts.expReward ?? ENEMY.EXP_REWARD;
    this.moveSpeed = opts.moveSpeed ?? ENEMY.MOVE_SPEED;
    this.isBoss = opts.isBoss ?? false;
    this.dir = Math.random() < 0.5 ? -1 : 1; // 초기 배회 방향

    // 머리 위 HP바
    const barColor = this.isBoss ? 0xff5252 : 0x2ecc71;
    this.hpBar = scene.add.rectangle(x, y - height / 2 - 8, width, this.isBoss ? 6 : 4, barColor);
  }

  update() {
    // 벽에 닿으면 방향 전환
    if (this.body.blocked.left) this.dir = 1;
    else if (this.body.blocked.right) this.dir = -1;
    this.body.setVelocityX(this.dir * this.moveSpeed);

    this.hpBar.setPosition(this.x, this.y - this.height / 2 - 8);
    this.hpBar.width = this.width * (this.hp / this.maxHp);
  }

  takeDamage(amount) {
    this.hp -= amount;

    // 피격 플래시
    this.setFillStyle(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.setFillStyle(this.baseColor);
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.scene.events.emit('enemy-killed', {
      exp: this.expReward,
      x: this.x,
      y: this.y,
      isBoss: this.isBoss,
    });
    this.destroy();
  }

  destroy(fromScene) {
    if (this.hpBar && this.hpBar.active) this.hpBar.destroy();
    super.destroy(fromScene);
  }
}
