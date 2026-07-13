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

    // ===== 인간 병사 모양 (머리 + 투구 + 창) =====
    const headR = width * 0.3;
    this.head = scene.add.circle(x, y - height / 2 - headR * 0.3, headR, 0xf0c9a0).setDepth(2); // 살색 머리
    this.helmet = scene.add
      .rectangle(x, y - height / 2 - headR * 0.9, headR * 2.2, headR * 0.9, this.isBoss ? 0x5a3a8a : 0x4a4038)
      .setDepth(3); // 투구
    this.spear = scene.add.rectangle(x, y, 3, height * 1.2, 0x8d6b4a).setDepth(1); // 창
    if (this.isBoss) {
      this.plume = scene.add.rectangle(x, y - height / 2 - headR * 1.5, headR * 0.5, headR * 0.9, 0xff5252).setDepth(3); // 장수 깃털
    }

    // 머리 위 HP바
    const barColor = this.isBoss ? 0xff5252 : 0x2ecc71;
    this.hpBar = scene.add.rectangle(x, y - height / 2 - headR * 1.6, width, this.isBoss ? 6 : 4, barColor).setDepth(4);
  }

  update() {
    // 벽에 닿으면 방향 전환
    if (this.body.blocked.left) this.dir = 1;
    else if (this.body.blocked.right) this.dir = -1;
    this.body.setVelocityX(this.dir * this.moveSpeed);

    // 장식 위치 갱신 (머리/투구/창/HP바)
    const headR = this.width * 0.3;
    const topY = this.y - this.height / 2;
    this.head.setPosition(this.x, topY - headR * 0.3);
    this.helmet.setPosition(this.x, topY - headR * 0.9);
    this.spear.setPosition(this.x + this.dir * (this.width / 2 + 3), this.y);
    if (this.plume) this.plume.setPosition(this.x, topY - headR * 1.5);
    this.hpBar.setPosition(this.x, topY - headR * 1.6);
    this.hpBar.width = this.width * (this.hp / this.maxHp);
  }

  takeDamage(amount) {
    this.hp -= amount;

    // 피격 플래시 + 피해 숫자 + 파편 (juice)
    this.setFillStyle(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.setFillStyle(this.baseColor);
    });
    if (this.scene.showDamage) this.scene.showDamage(this.x, this.y - this.height / 2, amount, '#fff3bf');
    if (this.hp > 0 && this.scene.deathBurst) this.scene.deathBurst(this.x, this.y, this.baseColor, false);

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
      color: this.baseColor,
    });
    this.destroy();
  }

  destroy(fromScene) {
    [this.hpBar, this.head, this.helmet, this.spear, this.plume].forEach((o) => {
      if (o && o.active) o.destroy();
    });
    super.destroy(fromScene);
  }
}
