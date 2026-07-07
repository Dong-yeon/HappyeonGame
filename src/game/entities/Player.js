import Phaser from 'phaser';
import { PLAYER } from '../constants.js';

/**
 * 화랑 캐릭터 — 자동 이동 / 자동 점프 / 자동 공격
 * 임시 스프라이트: 파란 사각형
 */
export default class Player extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, playerData) {
    super(scene, x, y, PLAYER.WIDTH, PLAYER.HEIGHT, PLAYER.COLOR);
    this.playerData = playerData;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(false);

    this.lastAttackTime = 0;
    this.invincibleUntil = 0;
  }

  update(time) {
    const target = this.findEnemyInRange();

    if (target) {
      // 1. 전투: 사거리 내 적이 있으면 멈춰서 공격
      this.body.setVelocityX(0);
      if (time - this.lastAttackTime >= PLAYER.ATTACK_COOLDOWN) {
        this.attack(target, time);
      }
    } else {
      // 2. 자동 이동: 적이 없으면 오른쪽으로 전진
      this.body.setVelocityX(PLAYER.MOVE_SPEED);

      // 3. 자동 점프: 전방 장애물 감지 시
      if (this.body.blocked.down && this.senseObstacleAhead()) {
        this.body.setVelocityY(PLAYER.JUMP_VELOCITY);
      }
    }

    // 피격 무적 시간 동안 깜빡임
    this.setAlpha(this.scene.time.now < this.invincibleUntil ? 0.5 : 1);
  }

  /** 전방 OBSTACLE_SENSE 거리 안에 장애물이 있는지 검사 */
  senseObstacleAhead() {
    const senseRect = new Phaser.Geom.Rectangle(
      this.x + PLAYER.WIDTH / 2,
      this.y - PLAYER.HEIGHT / 2,
      PLAYER.OBSTACLE_SENSE,
      PLAYER.HEIGHT,
    );
    return this.scene.obstacles.getChildren().some((obs) =>
      Phaser.Geom.Intersects.RectangleToRectangle(senseRect, obs.getBounds()),
    );
  }

  /** 전방 사거리 내 가장 가까운 적 반환 (없으면 null) */
  findEnemyInRange() {
    let closest = null;
    let closestDist = Infinity;
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active || enemy.x < this.x) return; // 뒤쪽 적은 무시
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist <= PLAYER.ATTACK_RANGE && dist < closestDist) {
        closest = enemy;
        closestDist = dist;
      }
    });
    return closest;
  }

  attack(target, time) {
    this.lastAttackTime = time;
    const { attackPower } = this.playerData.getState();

    // 검격 이펙트: 노란 사각형이 잠깐 나타났다 사라짐
    const slash = this.scene.add.rectangle(
      this.x + PLAYER.WIDTH / 2 + PLAYER.ATTACK_RANGE / 2,
      this.y,
      PLAYER.ATTACK_RANGE,
      PLAYER.HEIGHT * 0.6,
      0xffd54f,
      0.6,
    );
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      duration: 150,
      onComplete: () => slash.destroy(),
    });

    target.takeDamage(attackPower);
  }

  /** 적과 접촉 시 피해 (무적 시간 적용) */
  hitByEnemy(damage) {
    const now = this.scene.time.now;
    if (now < this.invincibleUntil) return;
    this.invincibleUntil = now + PLAYER.INVINCIBLE_TIME;

    const died = this.playerData.takeDamage(damage);
    if (died) {
      // 프로토타입: 즉시 부활 (스탯 유지)
      this.playerData.revive();
    }
  }
}
