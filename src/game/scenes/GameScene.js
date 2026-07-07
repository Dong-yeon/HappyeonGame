import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import { GAME_WIDTH, GAME_HEIGHT, PLATFORMS, WALL_THICKNESS, ENEMY } from '../constants.js';
import { playerData } from '../../data/playerData.js';

/**
 * 메인 사냥터 씬 — 고정 크기 맵 (메이플스토리 일반 사냥터 방식)
 * 여러 층의 플랫폼 위에서 적이 리스폰되고, 화랑이 가장 가까운 적을 자동으로 사냥한다.
 * 카메라 스크롤 없음 / 무한 생성 없음.
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.playerData = playerData;

    this.platforms = this.physics.add.staticGroup();
    this.walls = this.physics.add.staticGroup();
    this.enemies = this.add.group({ runChildUpdate: true });

    // ===== 플랫폼 생성 (바닥 + 공중 플랫폼) =====
    PLATFORMS.forEach((p) => {
      const color = p.isGround ? 0x5c4033 : 0x6b5344; // 바닥: 흙색 / 플랫폼: 옅은 갈색
      const plat = this.add.rectangle(p.x, p.y, p.width, p.height, color);
      // 윗면 잔디 표시
      this.add.rectangle(p.x, p.y - p.height / 2 + 4, p.width, 8, 0x4a7c3a);
      this.physics.add.existing(plat, true);
      this.platforms.add(plat);
    });

    // ===== 좌우 벽 =====
    [WALL_THICKNESS / 2, GAME_WIDTH - WALL_THICKNESS / 2].forEach((wx) => {
      const wall = this.add.rectangle(wx, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, 0x3a2e28);
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
    });

    // ===== 플레이어 (바닥 위에서 시작) =====
    const groundTop = PLATFORMS[0].y - PLATFORMS[0].height / 2;
    this.player = new Player(this, 220, groundTop - 80, playerData);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.overlap(this.player, this.enemies, () => {
      this.player.hitByEnemy(ENEMY.DAMAGE);
    });

    // ===== 적 스폰 (초기 + 주기적 리스폰, 최대 수 제한) =====
    for (let i = 0; i < 3; i += 1) this.spawnEnemy();
    this.time.addEvent({
      delay: ENEMY.SPAWN_INTERVAL,
      loop: true,
      callback: () => {
        if (this.enemies.getLength() < ENEMY.MAX_COUNT) this.spawnEnemy();
      },
    });

    // ===== 적 처치 → 경험치 획득 =====
    this.events.on('enemy-killed', ({ exp, x, y }) => {
      this.playerData.addKill();
      const leveledUp = this.playerData.gainExp(exp);
      this.showFloatingText(x, y - 30, `+${exp} EXP`, '#ffd54f');
      if (leveledUp) {
        this.showFloatingText(
          this.player.x,
          this.player.y - 60,
          `LEVEL UP! Lv.${this.playerData.getState().level}`,
          '#4dabf7',
        );
      }
    });
  }

  update(time) {
    this.player.update(time);

    // 낙사 안전장치 (벽으로 막혀 있어 거의 발생하지 않음)
    if (this.player.y > GAME_HEIGHT + 100) {
      this.player.setPosition(GAME_WIDTH / 2, 100);
      this.player.body.setVelocity(0, 0);
    }
  }

  /** (x, y) 에서 가장 가까운 적 반환 (없으면 null) */
  findNearestEnemy(x, y) {
    let closest = null;
    let closestDist = Infinity;
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist < closestDist) {
        closest = enemy;
        closestDist = dist;
      }
    });
    return closest;
  }

  /** 무작위 플랫폼 위 무작위 위치에 적 생성 */
  spawnEnemy() {
    const p = PLATFORMS[Phaser.Math.Between(0, PLATFORMS.length - 1)];
    const margin = ENEMY.WIDTH;
    const x = Phaser.Math.Between(p.x - p.width / 2 + margin, p.x + p.width / 2 - margin);
    const y = p.y - p.height / 2 - ENEMY.HEIGHT / 2;
    this.enemies.add(new Enemy(this, x, y));
  }

  /** 위로 떠오르며 사라지는 텍스트 이펙트 */
  showFloatingText(x, y, message, color) {
    const text = this.add
      .text(x, y, message, {
        fontSize: '16px',
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 900,
      onComplete: () => text.destroy(),
    });
  }
}
