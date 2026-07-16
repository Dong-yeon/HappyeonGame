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
  CHAPTER,
} from '../constants.js';
import { playerData } from '../../data/playerData.js';
import { stageData } from '../../data/stageData.js';
import { economyData } from '../../data/economyData.js';
import { evolutionData } from '../../data/evolutionData.js';
import { careData } from '../../data/careData.js';
import { rebirthData } from '../../data/rebirthData.js';
import { skillData } from '../../data/skillData.js';
import { expeditionData } from '../../data/expeditionData.js';
import { getYokaiTexture } from '../pixelArt.js';
import { audio } from '../audio.js';

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

    // ===== 배경 야경 (달/별/산 실루엣 + 스테이지별 하늘 그라데이션) =====
    this.createBackground();

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
    this.createPlayerDecor();

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
        audio.sfx('hatch');
        return;
      }
      if (evo.formId !== lastFormId) {
        const forward = evo.tier > lastTier; // 전진 진화만 배너 (전생 회귀는 제외)
        lastFormId = evo.formId;
        lastTier = evo.tier;
        if (forward) {
          const label = evo.isFinal ? `✦ 승천! ✦\n${evo.formName}` : `✦ 진화! ✦\n${evo.formName}`;
          this.showBanner(label, '#ffe08a');
          audio.sfx(evo.isFinal ? 'ascend' : 'evolve');
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
        audio.sfx('rebirth');
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
      const before = this.playerData.getState().hp;
      this.player.hitByEnemy(enemy.damage);
      // 실제로 피해를 입었으면 화면 흔들림 (juice)
      if (this.playerData.getState().hp < before) {
        this.cameras.main.shake(120, 0.006);
        this.showDamage(this.player.x, this.player.y - 20, enemy.damage, '#ff6b6b');
        audio.sfx('hurt');
      }
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
    this.events.on('enemy-killed', ({ exp, x, y, isBoss, color }) => {
      this.playerData.addKill();
      const leveledUp = this.playerData.gainExp(exp);
      this.showFloatingText(x, y - 30, `+${exp} EXP`, '#ffd54f');

      // 처치 이펙트 (juice): 파편 폭발 + 보스는 화면 흔들림
      this.deathBurst(x, y, color ?? 0xffffff, isBoss);
      audio.sfx(isBoss ? 'boss' : 'kill');
      if (isBoss) this.cameras.main.shake(260, 0.012);

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
        audio.sfx('levelup');
      }

      if (isBoss) {
        this.onBossDefeated();
      } else {
        const r = this.stageData.registerKill();
        if (r === 'boss') this.spawnBoss();
        else if (r === 'advance') this.applyStageBackground();
      }
    });

    // 시작 스테이지 배너
    const s0 = this.stageData.getState();
    this.showBanner(`챕터 ${s0.chapter} · ${s0.stageInChapter}/${CHAPTER.SIZE}\n${s0.stageName}`);
  }

  update(time) {
    this.player.update(time);
    this.updateSkills(time);
    this.updatePlayerDecor();

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
    const dmg = Math.round(power * skill.mult * expeditionData.getSkillMultiplier());
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
    audio.sfx('skill');
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
    const s = this.stageData.getState();
    const w = BOSS.WIDTH * CHAPTER.BOSS_SIZE_MUL;
    const h = BOSS.HEIGHT * CHAPTER.BOSS_SIZE_MUL;
    const groundTop = PLATFORMS[0].y - PLATFORMS[0].height / 2;
    this.enemies.add(
      new Enemy(this, GAME_WIDTH / 2, groundTop - h / 2, {
        width: w,
        height: h,
        color: BOSS.COLOR,
        moveSpeed: BOSS.MOVE_SPEED,
        hp: Math.round(ENEMY.HP * cfg.enemyHpMul * BOSS.HP_MUL * CHAPTER.BOSS_HP_MUL),
        damage: Math.round(ENEMY.DAMAGE * cfg.enemyDmgMul * BOSS.DAMAGE_MUL),
        expReward: ENEMY.EXP_REWARD * BOSS.EXP_MUL,
        isBoss: true,
      }),
    );
    this.showBanner(`⚔ 챕터 ${s.chapter} 보스 등장! ⚔\n관문을 돌파하라`, '#ff6b6b');
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
    const cleared = this.stageData.getState().chapter; // 방금 깬 챕터
    this.stageData.clearStage();
    const s = this.stageData.getState();
    this.applyStageBackground();

    // 챕터 클리어 재료 보상
    const mats = CHAPTER.MATERIAL_BASE + cleared * CHAPTER.MATERIAL_PER_CHAPTER;
    economyData.gainMaterials(mats);
    this.showFloatingText(this.player.x, this.player.y - 90, `+${mats} 재료`, '#c8b6ff');
    this.showBanner(`✦ 챕터 ${cleared} 클리어! ✦\n▶ 챕터 ${s.chapter} 진입 (+${mats} 재료)`, '#8ce99a');
    audio.sfx('clear');
  }

  /** 현재 스테이지 배경색 적용 */
  applyStageBackground() {
    const cfg = this.stageData.getConfig();
    this.cameras.main.setBackgroundColor(cfg.bgColor);
    // 스테이지 색으로 하늘 그라데이션 재도색 (위=스테이지색, 아래=어둡게)
    if (this.skyGfx) {
      const c = Phaser.Display.Color.IntegerToColor(cfg.bgColor);
      const dark = Phaser.Display.Color.GetColor(
        Math.round(c.red * 0.35),
        Math.round(c.green * 0.35),
        Math.round(c.blue * 0.35),
      );
      this.skyGfx.clear();
      this.skyGfx.fillGradientStyle(cfg.bgColor, cfg.bgColor, dark, dark, 1);
      this.skyGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  }

  /** 요괴(플레이어) 도트 스프라이트 — Player.js 는 건드리지 않고 씬이 따라다니게 */
  createPlayerDecor() {
    const evo = evolutionData.getState();
    this.playerSprite = this.add
      .sprite(this.player.x, this.player.y, getYokaiTexture(this, evo.species, evo.tier, evo.color))
      .setDepth(3);
    this._applyYokaiSize(evo.tier);
    this._lastYokaiKey = `${evo.species}_${evo.tier}_${evo.color}`;
    // 사각형 몸/방향 마커 숨김 (도트 스프라이트로 대체)
    this.player.setVisible(false);
    if (this.player.facingMarker) this.player.facingMarker.setVisible(false);
  }

  updatePlayerDecor() {
    if (!this.playerSprite) return;
    const p = this.player;
    const evo = evolutionData.getState();
    const key = `${evo.species}_${evo.tier}_${evo.color}`;
    if (key !== this._lastYokaiKey) {
      this.playerSprite.setTexture(getYokaiTexture(this, evo.species, evo.tier, evo.color));
      this._applyYokaiSize(evo.tier);
      this._lastYokaiKey = key;
    }
    this.playerSprite.setPosition(p.x, p.y);
    this.playerSprite.setFlipX(p.facing < 0);
    this.playerSprite.setAlpha(p.alpha); // 무적 깜빡임 동기화
  }

  /** 형태(tier)별 표시 크기 — 새끼는 작게, 최종체는 크게 (성장감) */
  _applyYokaiSize(tier) {
    const size = tier >= 3 ? [64, 74] : tier === 2 ? [48, 58] : [40, 46];
    this.playerSprite.setDisplaySize(size[0], size[1]);
  }

  /** 배경 야경: 하늘 그라데이션 + 달(글로우) + 별 + 산 실루엣 */
  createBackground() {
    this.skyGfx = this.add.graphics().setDepth(-20);

    // 달 (글로우 + 본체)
    this.add.circle(GAME_WIDTH - 210, 130, 66, 0xfff3bf, 0.12).setDepth(-18);
    this.add.circle(GAME_WIDTH - 210, 130, 46, 0xfff3bf, 0.2).setDepth(-18);
    this.add.circle(GAME_WIDTH - 210, 130, 34, 0xfdf6d8, 1).setDepth(-17);
    this.add.circle(GAME_WIDTH - 198, 122, 26, 0xf0e6c0, 0.5).setDepth(-16); // 음영

    // 별
    for (let i = 0; i < 46; i += 1) {
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(20, GAME_HEIGHT * 0.5);
      const s = Phaser.Math.FloatBetween(0.6, 1.6);
      this.add.circle(x, y, s, 0xffffff, Phaser.Math.FloatBetween(0.4, 0.9)).setDepth(-18);
    }

    // 산 실루엣 (뒤→앞, 점점 밝게)
    const horizon = GAME_HEIGHT - 90;
    const ranges = [
      { color: 0x161a2b, peaks: [[-50, 120], [280, 220], [620, 150], [980, 240], [1330, 160]], base: horizon + 30 },
      { color: 0x1f2438, peaks: [[-50, 60], [180, 150], [500, 90], [820, 170], [1150, 100], [1330, 150]], base: horizon + 60 },
    ];
    ranges.forEach((r) => {
      const g = this.add.graphics().setDepth(-15);
      g.fillStyle(r.color, 1);
      g.beginPath();
      g.moveTo(-50, r.base);
      r.peaks.forEach(([px, ph]) => g.lineTo(px, r.base - ph));
      g.lineTo(GAME_WIDTH + 50, r.base);
      g.lineTo(GAME_WIDTH + 50, GAME_HEIGHT);
      g.lineTo(-50, GAME_HEIGHT);
      g.closePath();
      g.fillPath();
    });
  }

  /** 떠오르며 사라지는 피해 숫자 */
  showDamage(x, y, amount, color = '#ffffff') {
    const t = this.add
      .text(x + Phaser.Math.Between(-8, 8), y, `${amount}`, {
        fontSize: '15px',
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 500, ease: 'Quad.Out', onComplete: () => t.destroy() });
  }

  /** 파편 폭발 (처치/타격) */
  deathBurst(x, y, color, big = false) {
    const n = big ? 14 : 7;
    for (let i = 0; i < n; i += 1) {
      const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const spd = Phaser.Math.Between(big ? 120 : 60, big ? 300 : 160);
      const p = this.add.rectangle(x, y, big ? 7 : 5, big ? 7 : 5, color).setDepth(55);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * spd,
        y: y + Math.sin(ang) * spd,
        alpha: 0,
        scale: 0.2,
        duration: big ? 480 : 340,
        ease: 'Quad.Out',
        onComplete: () => p.destroy(),
      });
    }
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
