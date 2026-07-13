import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLATFORMS,
  WALL_THICKNESS,
  ENEMY,
  BOSS,
  GOLD,
} from '../constants.js';
import { playerData } from '../../data/playerData.js';
import { stageData } from '../../data/stageData.js';
import { economyData } from '../../data/economyData.js';

/**
 * 메인 사냥터 씬 — 고정 크기 맵 (메이플스토리 일반 사냥터 방식) + 스테이지 진행 구조.
 *
 * 진행 루프: 일반 적 처치 → 스테이지 목표 수 도달 → 보스 등장 → 보스 처치 → 클리어 → 다음 스테이지(난이도 상승).
 * 카메라 스크롤 없음 / 무한 지형 생성 없음.
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.playerData = playerData;
    this.stageData = stageData;

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
    // 적마다 접촉 피해가 다르므로 적 자신의 damage 를 넘긴다 (Player AI 로직은 그대로)
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      this.player.hitByEnemy(enemy.damage);
    });

    // ===== 현재 스테이지 배경 적용 + 초기 적 스폰 =====
    this.applyStageBackground();
    for (let i = 0; i < 3; i += 1) this.spawnEnemy();

    this.spawnTimer = this.time.addEvent({
      delay: ENEMY.SPAWN_INTERVAL,
      loop: true,
      callback: () => {
        const s = this.stageData.getState();
        if (!s.bossActive && this.enemies.getLength() < ENEMY.MAX_COUNT) {
          this.spawnEnemy();
        }
      },
    });

    // ===== 적/보스 처치 처리 =====
    this.events.on('enemy-killed', ({ exp, x, y, isBoss }) => {
      this.playerData.addKill();
      const leveledUp = this.playerData.gainExp(exp);
      this.showFloatingText(x, y - 30, `+${exp} EXP`, '#ffd54f');

      // 골드 드랍 (스테이지 스케일 × 업그레이드 배율)
      const gold = this.rollGold(isBoss);
      economyData.gainGold(gold);
      this.showFloatingText(x + 14, y - 30, `+${gold} G`, '#ffd166');

      if (leveledUp) {
        this.showFloatingText(
          this.player.x,
          this.player.y - 70,
          `LEVEL UP! Lv.${this.playerData.getState().level}`,
          '#4dabf7',
        );
      }

      if (isBoss) {
        this.onBossDefeated();
      } else {
        const bossReady = this.stageData.registerKill();
        if (bossReady) this.spawnBoss();
      }
    });

    // 시작 스테이지 배너
    this.showBanner(`STAGE ${this.stageData.getState().stageNumber}\n${this.stageData.getState().stageName}`);
  }

  update(time) {
    this.player.update(time);

    // 낙사 안전장치 (벽으로 막혀 있어 거의 발생하지 않음)
    if (this.player.y > GAME_HEIGHT + 100) {
      this.player.setPosition(GAME_WIDTH / 2, 100);
      this.player.body.setVelocity(0, 0);
    }
  }

  /** (x, y) 에서 가장 가까운 적 반환 (없으면 null) — Player AI 가 호출 */
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

  /** 현재 스테이지 배율을 반영한 일반 적을 무작위 플랫폼 위에 생성 */
  spawnEnemy() {
    const cfg = this.stageData.getConfig();
    const p = PLATFORMS[Phaser.Math.Between(0, PLATFORMS.length - 1)];
    const margin = ENEMY.WIDTH;
    const x = Phaser.Math.Between(p.x - p.width / 2 + margin, p.x + p.width / 2 - margin);
    const y = p.y - p.height / 2 - ENEMY.HEIGHT / 2;
    this.enemies.add(
      new Enemy(this, x, y, {
        hp: Math.round(ENEMY.HP * cfg.enemyHpMul),
        damage: Math.round(ENEMY.DAMAGE * cfg.enemyDmgMul),
      }),
    );
  }

  /** 보스 등장 — 바닥 중앙에 생성 (스테이지 배율 + 보스 배율) */
  spawnBoss() {
    const cfg = this.stageData.getConfig();
    const groundTop = PLATFORMS[0].y - PLATFORMS[0].height / 2;
    const x = GAME_WIDTH / 2;
    const y = groundTop - BOSS.HEIGHT / 2;
    this.enemies.add(
      new Enemy(this, x, y, {
        width: BOSS.WIDTH,
        height: BOSS.HEIGHT,
        color: BOSS.COLOR,
        moveSpeed: BOSS.MOVE_SPEED,
        hp: Math.round(ENEMY.HP * cfg.enemyHpMul * BOSS.HP_MUL),
        damage: Math.round(ENEMY.DAMAGE * cfg.enemyDmgMul * BOSS.DAMAGE_MUL),
        expReward: ENEMY.EXP_REWARD * BOSS.EXP_MUL,
        isBoss: true,
      }),
    );
    this.showBanner('⚔ 보스 등장!', '#ff6b6b');
  }

  /** 처치 시 골드량 계산 (스테이지 스케일 × 업그레이드 배율) */
  rollGold(isBoss) {
    const idx = this.stageData.getState().stageIndex;
    const base = GOLD.ENEMY_BASE + idx * GOLD.ENEMY_PER_STAGE;
    const raw = isBoss ? base * BOSS.GOLD_MUL : base;
    return Math.max(1, Math.round(raw * economyData.getGoldMultiplier()));
  }

  /** 보스 처치 → 스테이지 클리어 → 다음 스테이지 */
  onBossDefeated() {
    this.stageData.clearStage();
    const s = this.stageData.getState();
    this.applyStageBackground();
    this.showBanner(`STAGE CLEAR!\n▶ STAGE ${s.stageNumber} · ${s.stageName}`, '#8ce99a');
  }

  /** 현재 스테이지 배경색 적용 */
  applyStageBackground() {
    const cfg = this.stageData.getConfig();
    this.cameras.main.setBackgroundColor(cfg.bgColor);
  }

  /** 화면 중앙 배너 (스테이지 전환/보스 등장 알림) */
  showBanner(message, color = '#ffd782') {
    const text = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, message, {
        fontSize: '34px',
        fontStyle: 'bold',
        color,
        align: 'center',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(100);
    text.setScale(0.8);
    this.tweens.add({
      targets: text,
      scale: 1,
      duration: 250,
      ease: 'Back.Out',
    });
    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 1100,
      duration: 500,
      onComplete: () => text.destroy(),
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
