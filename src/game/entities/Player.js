import Phaser from 'phaser';
import { PLAYER } from '../constants.js';

/**
 * 화랑 캐릭터 — 가장 가까운 적을 향해 자동 이동 / 좌우 반전 / 위층 점프 / 자동 공격
 * 임시 스프라이트: 파란 사각형 (+ 바라보는 방향 표시 마커)
 */
export default class Player extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, playerData) {
    super(scene, x, y, PLAYER.WIDTH, PLAYER.HEIGHT, PLAYER.COLOR);
    this.playerData = playerData;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCollideWorldBounds(true);

    this.lastAttackTime = 0;
    this.invincibleUntil = 0;
    this.facing = 1; // 1: 오른쪽, -1: 왼쪽

    // 바라보는 방향을 나타내는 칼 마커 (사각형 캐릭터라 반전이 안 보이므로 별도 표시)
    this.facingMarker = scene.add.rectangle(x, y, 12, 6, 0xffe08a);
  }

  update(time) {
    const target = this.scene.findNearestEnemy(this.x, this.y);

    if (target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
      const sameFloor = Math.abs(dy) <= PLAYER.ATTACK_VERTICAL_TOLERANCE;

      // 적 방향으로 좌우 반전
      if (Math.abs(dx) > 4) this.facing = dx > 0 ? 1 : -1;

      if (dist <= PLAYER.ATTACK_RANGE && sameFloor) {
        // 사거리 안 + 같은 층 → 멈춰서 공격
        this.body.setVelocityX(0);
        if (time - this.lastAttackTime >= PLAYER.ATTACK_COOLDOWN) {
          this.attack(target, time);
        }
      } else {
        // 적을 향해 이동
        this.body.setVelocityX(this.facing * PLAYER.MOVE_SPEED);

        // 적이 위층에 있거나 진행 방향이 막히면 점프
        const targetHigher = dy < -PLAYER.VERTICAL_REACH;
        const blockedAhead =
          (this.facing > 0 && this.body.blocked.right) ||
          (this.facing < 0 && this.body.blocked.left);
        if (this.body.blocked.down && (targetHigher || blockedAhead)) {
          this.body.setVelocityY(PLAYER.JUMP_VELOCITY);
        }
      }
    } else {
      // 적이 없으면 정지
      this.body.setVelocityX(0);
    }

    // 방향 마커 위치 갱신
    this.facingMarker.setPosition(this.x + this.facing * (PLAYER.WIDTH / 2 + 6), this.y);

    // 피격 무적 시간 동안 깜빡임
    this.setAlpha(this.scene.time.now < this.invincibleUntil ? 0.5 : 1);
  }

  attack(target, time) {
    this.lastAttackTime = time;
    const { attackPower } = this.playerData.getState();

    // 검격 이펙트: 바라보는 방향으로 노란 사각형이 잠깐 나타났다 사라짐
    const slash = this.scene.add.rectangle(
      this.x + this.facing * (PLAYER.WIDTH / 2 + PLAYER.ATTACK_RANGE / 2),
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

  destroy(fromScene) {
    if (this.facingMarker && this.facingMarker.active) this.facingMarker.destroy();
    super.destroy(fromScene);
  }
}
