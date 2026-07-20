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
  AMBUSH,
} from '../constants.js';
import { playerData } from '../../data/playerData.js';
import { stageData } from '../../data/stageData.js';
import { economyData } from '../../data/economyData.js';
import { evolutionData } from '../../data/evolutionData.js';
import { careData } from '../../data/careData.js';
import { rebirthData } from '../../data/rebirthData.js';
import { skillData } from '../../data/skillData.js';
import { expeditionData } from '../../data/expeditionData.js';
import { retentionData } from '../../data/retentionData.js';
import { getYokaiTexture } from '../pixelArt.js';
import { audio } from '../audio.js';
import { fmt } from '../../format.js';
import { adData } from '../../data/adData.js';

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
      plat.isGround = !!p.isGround; // 원웨이 판정용 (바닥만 완전 솔리드)
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

    // ===== 비정기 토벌대 기습 (악명도 기반) =====
    this.notoriety = 0; // 누적 처치 = 악명도
    this.nextAmbushAt = AMBUSH.NOTORIETY_FIRST;
    this.ambushActive = false;
    this.ambushRemaining = 0;

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
        this.resetAmbush();
        this.applyStageBackground();
        this.showBanner(`🥚 부화! 🥚\n${evo.speciesName}`, '#ffd782');
        audio.sfx('hatch');
        this.syncRetention();
        return;
      }
      if (evo.formId !== lastFormId) {
        const forward = evo.tier > lastTier; // 전진 진화만 배너 (전생 회귀는 제외)
        lastFormId = evo.formId;
        lastTier = evo.tier;
        if (forward) {
          let label;
          if (evo.tier >= 4) label = `✦ 합체 진화! ✦\n${evo.formName}`;
          else label = evo.isFinal ? `✦ 승천! ✦\n${evo.formName}` : `✦ 진화! ✦\n${evo.formName}`;
          this.showBanner(label, '#ffe08a');
          audio.sfx(evo.tier >= 4 || evo.isFinal ? 'ascend' : 'evolve');
          retentionData.recordEvolve();
        }
        this.syncRetention();
      }
    });

    // 전생 시: 적 정리 + 배경/연출 (스테이지·형태는 오케스트레이션에서 이미 초기화됨)
    let lastRebirth = rebirthData.getState().count;
    const unsubRebirth = rebirthData.subscribe((rb) => {
      if (rb.count > lastRebirth) {
        lastRebirth = rb.count;
        this.enemies.getChildren().slice().forEach((e) => e.destroy());
        this.resetAmbush();
        this.applyStageBackground();
        this.showBanner(`🔄 전생! 🔄\n환생 ${rb.count}회 · 영구 배율 ×${rb.multiplier}`, '#c0eb75');
        audio.sfx('rebirth');
        this.syncRetention();
      }
    });

    // 씬 종료 시 구독 해제 (싱글턴 모듈이 파괴된 씬을 참조하지 않도록)
    const cleanup = () => {
      unsubEvolution();
      unsubRebirth();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    // 공중 플랫폼은 원웨이: 아래에서 점프하면 통과, 위에서 내려올 때만 착지 (윗층 이동 막힘 해소)
    this.physics.add.collider(this.player, this.platforms, null, (player, platform) => {
      if (platform.isGround) return true; // 바닥은 항상 솔리드
      const b = player.body;
      return b.velocity.y >= 0 && b.bottom - b.deltaY() <= platform.body.top + 2;
    });
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
    this.events.on('enemy-killed', ({ exp, x, y, isBoss, isEscort, isAmbush, color }) => {
      this.playerData.addKill();
      const leveledUp = this.playerData.gainExp(exp);
      this.showFloatingText(x, y - 30, `+${fmt(exp)} EXP`, '#ffd54f');

      // 처치 이펙트 (juice): 파편 폭발 + 보스는 화면 흔들림
      this.deathBurst(x, y, color ?? 0xffffff, isBoss);
      audio.sfx(isBoss ? 'boss' : 'kill');
      if (isBoss) this.cameras.main.shake(260, 0.012);

      // 컨디션(탈진) 시 획득 효율 감소
      const gainMul = careData.getGainMultiplier();

      // 골드 드랍 (스테이지 스케일 × 업그레이드 배율 × 컨디션)
      const gold = Math.max(1, Math.round(this.rollGold(isBoss) * gainMul));
      economyData.gainGold(gold);
      this.showFloatingText(x + 14, y - 30, `+${fmt(gold)} G`, '#ffd166');

      // 정기 획득 (인간 포식 → 진화 재화, 컨디션 + 광고 부스트 반영)
      const essence = Math.max(1, Math.round(this.rollEssence(isBoss) * gainMul * adData.getEssenceMultiplier()));
      evolutionData.gainEssence(essence);
      this.showFloatingText(x - 14, y - 48, `+${fmt(essence)} 정기`, '#8ce9ff');

      // 리텐션(일일 미션·업적) 기록
      retentionData.recordKill();
      retentionData.recordGold(gold);
      retentionData.recordEssence(essence);
      if (isBoss) retentionData.recordBoss();
      this.syncRetention();

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
        // 토벌대 호위 병사 처치: 소량 추가 재료 (진행 집계는 registerKill 이 보스중엔 무시)
        if (isEscort) {
          economyData.gainMaterials(CHAPTER.RAID_ESCORT_MAT);
          this.showFloatingText(x, y - 66, `+${CHAPTER.RAID_ESCORT_MAT} 재료`, '#c8b6ff');
        }
        // 기습 이벤트 유닛 격파 집계 → 전멸 시 격퇴 보상
        if (isAmbush && this.ambushActive) {
          this.ambushRemaining -= 1;
          if (this.ambushRemaining <= 0) this.completeAmbush();
        }
        // 악명도 누적 → 임계 도달 시 기습 발생
        this.notoriety += 1;
        this.maybeTriggerAmbush();

        const r = this.stageData.registerKill();
        if (r === 'boss') this.spawnRaid();
        else if (r === 'advance') this.applyStageBackground();
      }
    });

    // 시작 스테이지 배너
    const s0 = this.stageData.getState();
    this.showBanner(`챕터 ${s0.chapter} · ${s0.stageInChapter}/${CHAPTER.SIZE}\n${s0.stageName}`);

    // 리텐션 최고기록 초기 동기화 (불러온 저장 데이터 반영)
    this.syncRetention();

    // 개발 모드 전용 디버그 핸들 (프로덕션 빌드에서는 제거됨)
    if (import.meta.env && import.meta.env.DEV && typeof window !== 'undefined') {
      window.__game = this;
    }
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

  /** 업적용 최고기록 지표 동기화 (레벨/챕터/전생/도감) */
  syncRetention() {
    retentionData.sync({
      level: playerData.getState().level,
      chapter: stageData.getState().chapter,
      rebirth: rebirthData.getState().count,
      discovered: evolutionData.getState().discovered.length,
    });
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

  /** 챕터 관문 = 인간 토벌대 습격 — 대장 장수 + 호위 병사 웨이브 */
  spawnRaid() {
    const cfg = this.stageData.getConfig();
    const s = this.stageData.getState();
    const groundTop = PLATFORMS[0].y - PLATFORMS[0].height / 2;

    // 대장 장수 (기존 챕터 보스 = 필수 처치 대상)
    const w = BOSS.WIDTH * CHAPTER.BOSS_SIZE_MUL;
    const h = BOSS.HEIGHT * CHAPTER.BOSS_SIZE_MUL;
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

    // 호위 병사 (챕터에 비례해 증가) — 정예라 체력 가중, 붉은 깃발 표식
    const escortCount = Math.min(
      CHAPTER.RAID_ESCORT_MAX,
      Math.round(CHAPTER.RAID_ESCORT_BASE + (s.chapter - 1) * CHAPTER.RAID_ESCORT_PER_CHAPTER),
    );
    for (let i = 0; i < escortCount; i += 1) {
      const p = PLATFORMS[Phaser.Math.Between(0, PLATFORMS.length - 1)];
      const margin = ENEMY.WIDTH;
      const ex = Phaser.Math.Between(p.x - p.width / 2 + margin, p.x + p.width / 2 - margin);
      const ey = p.y - p.height / 2 - ENEMY.HEIGHT / 2;
      this.enemies.add(
        new Enemy(this, ex, ey, {
          hp: Math.round(ENEMY.HP * cfg.enemyHpMul * CHAPTER.RAID_ESCORT_HP_MUL),
          damage: Math.round(ENEMY.DAMAGE * cfg.enemyDmgMul),
          isEscort: true,
        }),
      );
    }

    audio.sfx('raid');
    this.cameras.main.shake(280, 0.006);
    this.showBanner(
      `⚔ 챕터 ${s.chapter} 인간 토벌대 습격! ⚔\n대장을 처치해 관문을 돌파하라 (호위 ${escortCount})`,
      '#ff6b6b',
    );
  }

  /** 악명도 임계 도달 시 비정기 기습 발생 (관문/보스와 겹치지 않음) */
  maybeTriggerAmbush() {
    if (this.ambushActive) return;
    const s = this.stageData.getState();
    if (s.bossActive || s.isChapterBossStage) return;
    if (this.notoriety < this.nextAmbushAt) return;
    this.spawnAmbush();
  }

  /** 비정기 토벌대 기습 — 기습 대장(미니) + 정예 병사 웨이브 (진행 무관 보너스) */
  spawnAmbush() {
    const cfg = this.stageData.getConfig();
    const s = this.stageData.getState();
    const groundTop = PLATFORMS[0].y - PLATFORMS[0].height / 2;

    // 기습 대장 (미니 — 장수 외형, 관문 보스보다 약함, isBoss 아님)
    const cw = BOSS.WIDTH * AMBUSH.CAPTAIN_SIZE_MUL;
    const ch = BOSS.HEIGHT * AMBUSH.CAPTAIN_SIZE_MUL;
    this.enemies.add(
      new Enemy(this, GAME_WIDTH / 2, groundTop - ch / 2, {
        width: cw,
        height: ch,
        color: BOSS.COLOR,
        moveSpeed: BOSS.MOVE_SPEED,
        hp: Math.round(ENEMY.HP * cfg.enemyHpMul * AMBUSH.CAPTAIN_HP_MUL),
        damage: Math.round(ENEMY.DAMAGE * cfg.enemyDmgMul * BOSS.DAMAGE_MUL),
        expReward: ENEMY.EXP_REWARD * 3,
        captain: true,
        isAmbush: true,
      }),
    );

    const count = Math.min(
      AMBUSH.ESCORT_MAX,
      Math.round(AMBUSH.ESCORT_BASE + (s.chapter - 1) * AMBUSH.ESCORT_PER_CHAPTER),
    );
    for (let i = 0; i < count; i += 1) {
      const p = PLATFORMS[Phaser.Math.Between(0, PLATFORMS.length - 1)];
      const margin = ENEMY.WIDTH;
      const ex = Phaser.Math.Between(p.x - p.width / 2 + margin, p.x + p.width / 2 - margin);
      const ey = p.y - p.height / 2 - ENEMY.HEIGHT / 2;
      this.enemies.add(
        new Enemy(this, ex, ey, {
          hp: Math.round(ENEMY.HP * cfg.enemyHpMul * AMBUSH.ESCORT_HP_MUL),
          damage: Math.round(ENEMY.DAMAGE * cfg.enemyDmgMul),
          isEscort: true,
          isAmbush: true,
        }),
      );
    }

    this.ambushActive = true;
    this.ambushRemaining = count + 1; // 병사 + 기습 대장
    this.nextAmbushAt = this.notoriety + AMBUSH.NOTORIETY_INTERVAL; // 임시(완료 시 재설정)
    audio.sfx('raid');
    this.cameras.main.shake(300, 0.007);
    this.showBanner(`🚨 인간 토벌대 기습! 🚨\n격퇴하면 큰 보상 (적 ${this.ambushRemaining})`, '#ffa94d');
  }

  /** 기습 전멸 → 격퇴 보상 (재료·정기·골드) */
  completeAmbush() {
    if (!this.ambushActive) return;
    this.ambushActive = false;
    this.ambushRemaining = 0;
    const chapter = this.stageData.getState().chapter;
    const mats = AMBUSH.REWARD_MAT_BASE + chapter * AMBUSH.REWARD_MAT_PER_CH;
    const essence = AMBUSH.REWARD_ESSENCE_BASE + chapter * AMBUSH.REWARD_ESSENCE_PER_CH;
    const gold = AMBUSH.REWARD_GOLD_BASE + chapter * AMBUSH.REWARD_GOLD_PER_CH;
    economyData.gainMaterials(mats);
    evolutionData.gainEssence(essence);
    economyData.gainGold(gold);
    this.nextAmbushAt = this.notoriety + AMBUSH.NOTORIETY_INTERVAL; // 다음 기습까지 한 간격
    audio.sfx('clear');
    this.showFloatingText(this.player.x, this.player.y - 90, `+${fmt(mats)} 재료 · +${fmt(essence)} 정기 · +${fmt(gold)} G`, '#ffd166');
    this.showBanner(`✦ 토벌대 격퇴! ✦\n+${fmt(mats)} 재료 · +${fmt(essence)} 정기 · +${fmt(gold)} G`, '#8ce99a');
  }

  /** 기습 상태 초기화 (적 일괄 정리 이벤트에서 카운터가 어긋나지 않도록) */
  resetAmbush() {
    if (!this.ambushActive) return;
    this.ambushActive = false;
    this.ambushRemaining = 0;
    this.nextAmbushAt = this.notoriety + AMBUSH.NOTORIETY_INTERVAL;
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

  /** 토벌대 대장 처치 → 관문 돌파 → 다음 챕터. 남은 호위 병사는 퇴각(제거). */
  onBossDefeated() {
    const cleared = this.stageData.getState().chapter; // 방금 깬 챕터

    // 남은 토벌대 호위 병사 퇴각 (파편 이펙트 후 제거)
    this.enemies.getChildren().slice().forEach((e) => {
      if (e.active && e.isEscort) {
        this.deathBurst(e.x, e.y, e.baseColor ?? 0xffffff, false);
        e.destroy();
      }
    });
    this.resetAmbush(); // 관문 처리로 기습 유닛이 함께 정리될 수 있으므로 카운터 초기화
    // 관문 유예: 관문 중 억제되며 쌓인 악명도로 격파 직후 기습이 곧바로 터지는 스파이크 방지
    this.nextAmbushAt = Math.max(this.nextAmbushAt, this.notoriety + AMBUSH.NOTORIETY_INTERVAL);

    this.stageData.clearStage();
    const s = this.stageData.getState();
    this.applyStageBackground();

    // 토벌대 격파 재료 보상
    const mats = CHAPTER.MATERIAL_BASE + cleared * CHAPTER.MATERIAL_PER_CHAPTER;
    economyData.gainMaterials(mats);
    this.showFloatingText(this.player.x, this.player.y - 90, `+${fmt(mats)} 재료`, '#c8b6ff');
    this.showBanner(`✦ 챕터 ${cleared} 토벌대 격파! ✦\n▶ 챕터 ${s.chapter} 진입 (+${fmt(mats)} 재료)`, '#8ce99a');
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
    // 바닥 접지 그림자 (입체감)
    this.playerShadow = this.add.ellipse(this.player.x, this.player.y, 44, 12, 0x000000, 0.32).setDepth(2);
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
    // 미세한 숨쉬기 바운스(생동감) — 그림자는 바닥에 고정
    const bob = Math.sin(this.time.now / 320) * 1.2;
    this.playerSprite.setPosition(p.x, p.y + bob);
    this.playerSprite.setFlipX(p.facing < 0);
    this.playerSprite.setAlpha(p.alpha); // 무적 깜빡임 동기화
    // 발밑 그림자: 스프라이트 바닥에 붙되 크기는 형태 크기 비례
    const half = this.playerSprite.displayHeight / 2;
    this.playerShadow.setPosition(p.x, p.y + half - 3);
    this.playerShadow.setDisplaySize(this.playerSprite.displayWidth * 0.7, 11);
    this.playerShadow.setAlpha(0.3 * p.alpha);
  }

  /** 형태(tier)별 표시 크기 — 새끼는 작게, 궁극체는 가장 크게 (성장감) */
  _applyYokaiSize(tier) {
    const size = tier >= 4 ? [78, 90] : tier === 3 ? [64, 74] : tier === 2 ? [48, 58] : [40, 46];
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
      .text(x + Phaser.Math.Between(-8, 8), y, fmt(amount), {
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
