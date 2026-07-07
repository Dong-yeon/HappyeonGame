import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_Y,
  GROUND_HEIGHT,
  ENEMY,
  OBSTACLE,
} from '../constants.js';
import { playerData } from '../../data/playerData.js';

/**
 * 메인 스테이지 씬 — 무한 횡스크롤 자동 전투
 * 캐릭터는 오른쪽으로 계속 전진하고, 지형/장애물/적은 전방에 계속 생성된다.
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.playerData = playerData;

    // ===== 지형 / 오브젝트 그룹 =====
    this.grounds = this.physics.add.staticGroup();
    this.obstacles = this.physics.add.staticGroup();
    this.enemies = this.add.group({ runChildUpdate: true });

    this.groundExtent = 0; // 여기까지 지형 생성됨 (월드 x좌표)
    this.extendGround(GAME_WIDTH * 2);

    // ===== 플레이어 =====
    this.player = new Player(this, 120, GROUND_Y - 100, playerData);

    this.physics.add.collider(this.player, this.grounds);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.grounds);
    this.physics.add.overlap(this.player, this.enemies, (_player, _enemy) => {
      this.player.hitByEnemy(ENEMY.DAMAGE);
    });

    // ===== 카메라: 플레이어를 화면 왼쪽 1/4 지점에 두고 수평으로만 추적 =====
    this.cameras.main.startFollow(this.player, false, 1, 0);
    this.cameras.main.setFollowOffset(-GAME_WIDTH / 4, this.player.y - GAME_HEIGHT / 2);

    // ===== 스폰 타이머 =====
    this.time.addEvent({
      delay: ENEMY.SPAWN_INTERVAL,
      loop: true,
      callback: () => this.spawnEnemy(),
    });
    this.time.addEvent({
      delay: OBSTACLE.SPAWN_INTERVAL,
      loop: true,
      callback: () => this.spawnObstacle(),
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

    const scrollX = this.cameras.main.scrollX;

    // 전방 지형을 미리 생성
    this.extendGround(scrollX + GAME_WIDTH * 2);

    // 화면 왼쪽으로 벗어난 오브젝트 정리
    this.cleanupBehind(scrollX - 200);

    // 혹시 낙하하면 지면 위로 복귀 (안전장치)
    if (this.player.y > GAME_HEIGHT + 100) {
      this.player.setPosition(scrollX + 120, GROUND_Y - 100);
      this.player.body.setVelocity(0, 0);
    }
  }

  /** toX 지점까지 지면 세그먼트를 이어 붙인다 */
  extendGround(toX) {
    const SEGMENT = 400;
    while (this.groundExtent < toX) {
      const x = this.groundExtent + SEGMENT / 2;
      const ground = this.add.rectangle(
        x,
        GROUND_Y + GROUND_HEIGHT / 2,
        SEGMENT,
        GROUND_HEIGHT,
        0x5c4033, // 흙: 갈색
      );
      // 지면 윗면 잔디
      this.add.rectangle(x, GROUND_Y + 4, SEGMENT, 8, 0x4a7c3a);
      this.physics.add.existing(ground, true);
      this.grounds.add(ground);
      this.groundExtent += SEGMENT;
    }
  }

  /** 화면 오른쪽 바깥에 적 생성 */
  spawnEnemy() {
    const x = this.cameras.main.scrollX + GAME_WIDTH + 60;
    const y = GROUND_Y - ENEMY.HEIGHT / 2;
    this.enemies.add(new Enemy(this, x, y));
  }

  /** 화면 오른쪽 바깥에 장애물 생성 */
  spawnObstacle() {
    const height = Phaser.Math.Between(OBSTACLE.MIN_HEIGHT, OBSTACLE.MAX_HEIGHT);
    const x = this.cameras.main.scrollX + GAME_WIDTH + 120;
    const obstacle = this.add.rectangle(
      x,
      GROUND_Y - height / 2,
      OBSTACLE.WIDTH,
      height,
      OBSTACLE.COLOR,
    );
    this.physics.add.existing(obstacle, true);
    this.obstacles.add(obstacle);
  }

  /** limitX 보다 왼쪽에 있는 적/장애물/지면을 제거해 메모리 누수 방지 */
  cleanupBehind(limitX) {
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.x < limitX) enemy.destroy();
    });
    this.obstacles.getChildren().forEach((obs) => {
      if (obs.x < limitX) obs.destroy();
    });
    this.grounds.getChildren().forEach((ground) => {
      if (ground.x + ground.width / 2 < limitX) ground.destroy();
    });
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
