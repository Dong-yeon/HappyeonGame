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
  ESSENCE,
} from '../constants.js';
import { playerData } from '../../data/playerData.js';
import { stageData } from '../../data/stageData.js';
import { economyData } from '../../data/economyData.js';
import { evolutionData } from '../../data/evolutionData.js';
import { careData } from '../../data/careData.js';
import { rebirthData } from '../../data/rebirthData.js';
import { skillData } from '../../data/skillData.js';

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

    // ===== 플레이어(요괴, 바닥 위에서 시작) — 현재 진화 단계 색 적용 =====
    const groundTop = PLATFORMS[0].y - PLATFORMS[0].height / 2;
    this.player = new Player(this, 220, groundTop - 80, playerData);
    this.player.setFillStyle(evolutionData.getColor());

    // ===== 스킬 (형태별 고유기, 쿨타임마다 자동 발동) =====
    this.lastSkillTime = 0;
    skillData.setSkill(evolutionData.getSkill());

    // 진화/부화 시: 요괴 색 갱신 + 스킬 교체 + 연출 (Player AI 로직은 건드리지 않음)
    let lastFormId = evolutionData.getState().formId;
    let lastTier = evolutionData.getState().tier;
    let lastSpecies = evolutionData.getState().species;
    const unsubEvolution = evolutionData.subscribe((evo) => {
      this.player.setFillStyle(evo.color);
      skillData.setSkill(evolutionData.getSkill());
      if (evo.species !== lastSpecies) {
        // 부화(종족 전환): 적 정리 + 배경/배너, 진화 배너는 생략
        lastSpecies = evo.species;
        lastFormId = evo.formId;
        lastTier = evo.tier;
        this.enemies.getChildren().slice().forEach((e) => e.destroy());
        this.applyStageBackground();
        this.showBanner(`🥚 부화! 🥚\n${evo.speciesName}`, '#ffd782');
        return;
      }
      if (evo.formId !== lastFormId) {
        const forward = evo.tier > lastTier; // 전진 진화만 배너 (전생 회귀는 제외)
        lastFormId = evo.formId;
        lastTier = evo.tier;
        if (forward) {
          const label = evo.isFinal ? `✦ 승천! ✦\n${evo.formName}` : `✦ 진화! ✦\n${evo.formName}`;
          this.showBanner(label, '#ffe08a');
        }
      }
    });

    // 전생 시: 적 정리 + 배경/연출 (스테이지·형태는 오케스트레이션에서 이미 초기화됨)
    let lastRebirth = rebirthData.getState().count;
    const unsubRebirth = rebirthData.subscribe((rb) => {
      if (rb.count > lastRebirth) {
        lastRebirth = rb.count;
        this.enemies.getChildren().slice().forEach((e) => e.destroy());
        this.applyStageBackground();
        this.showBanner(`🔄 전생! 🔄\n환생 ${rb.count}회 · 영구 배율 ×${rb.multiplier}`, '#c0eb75');
      }
    });

    // 씬 종료 시 구독 해제 (싱글턴 모듈이 파괴된 씬을 참조하지 않도록)
    const cleanup = () => {
      unsubEvolution();
      unsubRebirth();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

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

      // 컨디션(탈진) 시 획득 효율 감소
      const gainMul = careData.getGainMultiplier();

      // 골드 드랍 (스테이지 스케일 × 업그레이드 배율 × 컨디션)
      const gold = Math.max(1, Math.round(this.rollGold(isBoss) * gainMul));
      economyData.gainGold(gold);
      this.showFloatingText(x + 14, y - 30, `+${gold} G`, '#ffd166');

      // 정기 획득 (인간 포식 → 진화 재화, 컨디션 반영)
      const essence = Math.max(1, Math.round(this.rollEssence(isBoss) * gainMul));
      evolutionData.gainEssence(essence);
      this.showFloatingText(x - 14, y - 48, `+${essence} 정기`, '#8ce9ff');

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
    this.updateSkills(time);

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

  /** 형태별 고유 스킬을 쿨타임마다 자동 발동 (사거리 내 적이 있을 때만) */
  updateSkills(time) {
    const skill = evolutionData.getSkill();
    if (!skill) return;
    if (time - this.lastSkillTime < skill.cooldown) return;

    const power = this.playerData.getState().attackPower;
    const dmg = Math.round(power * skill.mult);
    const px = this.player.x;
    const py = this.player.y;
    const facing = this.player.facing;

    if (skill.type === 'strike') {
      const target = this.findNearestEnemy(px, py);
      if (!target || Phaser.Math.Distance.Between(px, py, target.x, target.y) > skill.range) return;
      target.takeDamage(dmg);
      this.skillStrikeFx(target.x, target.y, skill.color);
    } else if (skill.type === 'aoe') {
      const hit = this.enemies.getChildren().filter(
        (e) => e.active && Phaser.Math.Distance.Between(px, py, e.x, e.y) <= skill.range,
      );
      if (!hit.length) return;
      hit.forEach((e) => e.takeDamage(dmg));
      this.skillAoeFx(px, py, skill.range, skill.color);
    } else if (skill.type === 'beam') {
      const hit = this.enemies.getChildren().filter((e) => {
        if (!e.active) return false;
        const ahead = facing > 0 ? e.x >= px : e.x <= px;
        return ahead && Math.abs(e.x - px) <= skill.range && Math.abs(e.y - py) <= 50;
      });
      if (!hit.length) return;
      hit.forEach((e) => e.takeDamage(dmg));
      this.skillBeamFx(px, py, facing, skill.range, skill.color);
    } else {
      return;
    }

    this.lastSkillTime = time;
    skillData.markCast();
    this.showFloatingText(px, py - this.player.height, skill.name, this.hex(skill.color));
  }

  hex(int) {
    return `#${int.toString(16).padStart(6, '0')}`;
  }

  /** 단일 강타 이펙트 */
  skillStrikeFx(x, y, color) {
    const fx = this.add.star(x, y, 6, 14, 30, color, 0.85).setDepth(50);
    this.tweens.add({ targets: fx, scale: 1.8, alpha: 0, angle: 60, duration: 260, onComplete: () => fx.destroy() });
  }

  /** 광역 이펙트 (플레이어 중심 원) */
  skillAoeFx(x, y, radius, color) {
    const ring = this.add.circle(x, y, radius, color, 0.22).setStrokeStyle(4, color, 0.8).setDepth(49);
    ring.setScale(0.3);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 340, onComplete: () => ring.destroy() });
  }

  /** 전방 관통 이펙트 (브레스) */
  skillBeamFx(x, y, facing, range, color) {
    const beam = this.add
      .rectangle(x + (facing * range) / 2, y, range, 44, color, 0.55)
      .setDepth(49);
    this.tweens.add({ targets: beam, alpha: 0, scaleY: 1.6, duration: 300, onComplete: () => beam.destroy() });
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

  /** 포식 시 정기량 계산 (스테이지 스케일, 보스 가중) */
  rollEssence(isBoss) {
    const idx = this.stageData.getState().stageIndex;
    const base = ESSENCE.PER_HUMAN + idx * ESSENCE.PER_STAGE;
    return Math.max(1, Math.round(isBoss ? base * BOSS.ESSENCE_MUL : base));
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
