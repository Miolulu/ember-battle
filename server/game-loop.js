const CHARACTERS = require('./characters');
const physics = require('./physics');

const TICK_MS = 50;
const PLAYER_RADIUS = 18;
const BULLET_RADIUS = 5;
const SHOOT_COOLDOWN = 350;
const BULLET_LIFETIME = 3000;

const SPAWN_POINTS = [
  { x: 120, y: 120 },
  { x: 1080, y: 120 },
  { x: 120, y: 680 },
  { x: 1080, y: 680 },
  { x: 600, y: 120 },
  { x: 600, y: 680 },
];

function createDefaultMap() {
  const map = Array.from({ length: physics.MAP_HEIGHT }, () =>
    Array(physics.MAP_WIDTH).fill(0)
  );

  for (let x = 0; x < physics.MAP_WIDTH; x++) {
    map[0][x] = 1;
    map[physics.MAP_HEIGHT - 1][x] = 1;
  }
  for (let y = 0; y < physics.MAP_HEIGHT; y++) {
    map[y][0] = 1;
    map[y][physics.MAP_WIDTH - 1] = 1;
  }

  for (let x = 8; x < 12; x++) map[5][x] = 2;
  for (let x = 18; x < 22; x++) map[5][x] = 2;
  for (let x = 8; x < 12; x++) map[14][x] = 2;
  for (let x = 18; x < 22; x++) map[14][x] = 2;

  for (let y = 8; y < 12; y++) {
    map[y][10] = 1;
    map[y][19] = 1;
  }

  map[10][15] = 1;
  map[10][16] = 1;

  return map;
}

function normalize(dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

function angleFromDir(dx, dy) {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return 0;
  return Math.atan2(dy, dx);
}

let nextBulletId = 1;
let nextWallId = 1;

class GameLoop {
  constructor(room, playerList, broadcast) {
    this.room = room;
    this.broadcast = broadcast;
    this.tick = 0;
    this.map = createDefaultMap();
    this.bullets = [];
    this.healZones = [];
    this.tempWalls = [];
    this.inputs = new Map();
    this.interval = null;
    this.ended = false;

    this.players = new Map();
    playerList.forEach((entry, i) => {
      const def = CHARACTERS[entry.charId];
      const spawn = SPAWN_POINTS[i % SPAWN_POINTS.length];
      this.players.set(entry.ws, {
        ws: entry.ws,
        id: entry.id,
        charId: entry.charId,
        x: spawn.x,
        y: spawn.y,
        dir: 0,
        hp: def.maxHp,
        maxHp: def.maxHp,
        alive: true,
        kills: 0,
        deaths: 0,
        shootCooldown: 0,
        skillCooldown: 0,
        effects: [],
      });
    });
  }

  start() {
    this.interval = setInterval(() => this.tickGame(), TICK_MS);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  queueInput(ws, input) {
    this.inputs.set(ws, input);
  }

  removePlayer(ws) {
    const player = this.players.get(ws);
    if (player && player.alive) {
      player.alive = false;
      player.hp = 0;
      player.deaths++;
    }
    this.players.delete(ws);
    this.inputs.delete(ws);
  }

  getPlayerById(id) {
    for (const p of this.players.values()) {
      if (p.id === id) return p;
    }
    return null;
  }

  addEffect(player, type, durationMs) {
    player.effects.push({ type, expiresAt: this.tick * TICK_MS + durationMs });
  }

  cleanEffects(player) {
    const now = this.tick * TICK_MS;
    player.effects = player.effects.filter((e) => e.expiresAt > now);
  }

  hasEffect(player, type) {
    this.cleanEffects(player);
    return player.effects.some((e) => e.type === type);
  }

  tickGame() {
    this.tick++;
    const now = this.tick * TICK_MS;

    this.processInputs(now);
    this.movePlayers();
    this.moveBullets();
    this.tickHealZones();
    this.tickTempWalls(now);
    this.checkWinCondition();
    this.broadcastState();
  }

  processInputs(now) {
    for (const [ws, input] of this.inputs) {
      const player = this.players.get(ws);
      if (!player || !player.alive) continue;

      const def = CHARACTERS[player.charId];
      const dir = normalize(input.dir[0], input.dir[1]);
      if (dir.x !== 0 || dir.y !== 0) {
        player.dir = angleFromDir(dir.x, dir.y);
      }

      if (input.shoot && player.shootCooldown <= 0 && (dir.x !== 0 || dir.y !== 0)) {
        this.spawnBullet(player, dir.x, dir.y, def.damage, def.bulletSpeed, false);
        player.shootCooldown = SHOOT_COOLDOWN;
      }

      if (input.skill && player.skillCooldown <= 0) {
        this.useSkill(player, def);
        player.skillCooldown = def.skillCooldown;
      }

      player.pendingMove = dir;
      player.shootCooldown = Math.max(0, player.shootCooldown - TICK_MS);
      player.skillCooldown = Math.max(0, player.skillCooldown - TICK_MS);
      this.cleanEffects(player);
    }
    this.inputs.clear();
  }

  movePlayers() {
    for (const player of this.players.values()) {
      if (!player.alive) continue;

      const def = CHARACTERS[player.charId];
      const move = player.pendingMove || { x: 0, y: 0 };
      delete player.pendingMove;

      let nx = player.x + move.x * def.speed;
      let ny = player.y + move.y * def.speed;

      const resolved = physics.resolveWallCollision(nx, ny, PLAYER_RADIUS, this.map);
      for (const wall of this.tempWalls) {
        if (this.circleRectHit(resolved.x, resolved.y, PLAYER_RADIUS, wall)) {
          resolved.x = player.x;
          resolved.y = player.y;
          break;
        }
      }

      player.x = resolved.x;
      player.y = resolved.y;
    }
  }

  circleRectHit(cx, cy, radius, wall) {
    for (const tile of wall.tiles) {
      const rx = tile.tx * physics.TILE_SIZE;
      const ry = tile.ty * physics.TILE_SIZE;
      const closestX = Math.max(rx, Math.min(cx, rx + physics.TILE_SIZE));
      const closestY = Math.max(ry, Math.min(cy, ry + physics.TILE_SIZE));
      const dx = cx - closestX;
      const dy = cy - closestY;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
    return false;
  }

  spawnBullet(owner, dx, dy, damage, speed, phaseThrough) {
    const dir = normalize(dx, dy);
    const offset = PLAYER_RADIUS + BULLET_RADIUS + 2;
    this.bullets.push({
      id: nextBulletId++,
      ownerId: owner.id,
      x: owner.x + dir.x * offset,
      y: owner.y + dir.y * offset,
      dx: dir.x,
      dy: dir.y,
      speed,
      damage,
      phaseThrough,
      bornAt: this.tick * TICK_MS,
    });
  }

  useSkill(player, def) {
    switch (player.charId) {
      case 'yan': this.skillYan(player, def); break;
      case 'shenmu': this.skillShenmu(player); break;
      case 'sutang': this.skillSutang(player); break;
      case 'luyu': this.skillLuyu(player); break;
      case 'jiangxue': this.skillJiangxue(player, def); break;
      case 'peijin': this.addEffect(player, 'dodge', 3000); break;
    }
  }

  skillYan(player, def) {
    const baseAngle = player.dir;
    const spread = (60 * Math.PI) / 180;
    const count = 5;
    const fanDamage = Math.round(def.damage * 0.5);

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = baseAngle - spread / 2 + spread * t;
      this.spawnBullet(player, Math.cos(angle), Math.sin(angle), fanDamage, def.bulletSpeed, false);
    }
  }

  skillShenmu(player) {
    for (const other of this.players.values()) {
      if (other.id === player.id || !other.alive) continue;
      const dx = other.x - player.x;
      const dy = other.y - player.y;
      if (dx * dx + dy * dy <= 150 * 150) {
        this.addEffect(other, 'disrupted', 3000);
      }
    }
  }

  skillSutang(player) {
    this.healZones.push({
      x: player.x,
      y: player.y,
      radius: 80,
      healPerTick: 5,
      expiresAt: this.tick * TICK_MS + 4000,
      ownerId: player.id,
    });
  }

  skillLuyu(player) {
    const cos = Math.cos(player.dir);
    const sin = Math.sin(player.dir);
    const centerDist = physics.TILE_SIZE * 2;
    const cx = player.x + cos * centerDist;
    const cy = player.y + sin * centerDist;
    const perpX = -sin;
    const perpY = cos;

    const tiles = [];
    for (let i = -1; i <= 1; i++) {
      const wx = cx + perpX * i * physics.TILE_SIZE;
      const wy = cy + perpY * i * physics.TILE_SIZE;
      const tx = Math.floor(wx / physics.TILE_SIZE);
      const ty = Math.floor(wy / physics.TILE_SIZE);
      if (physics.tileAt(this.map, tx, ty) === 0) {
        tiles.push({ tx, ty });
        this.map[ty][tx] = 1;
      }
    }

    if (tiles.length > 0) {
      this.tempWalls.push({
        id: nextWallId++,
        tiles,
        expiresAt: this.tick * TICK_MS + 4000,
      });
    }
  }

  skillJiangxue(player, def) {
    this.spawnBullet(player, Math.cos(player.dir), Math.sin(player.dir), def.damage, def.bulletSpeed, true);
  }

  moveBullets() {
    const now = this.tick * TICK_MS;
    const remaining = [];

    for (const bullet of this.bullets) {
      bullet.x += bullet.dx * bullet.speed;
      bullet.y += bullet.dy * bullet.speed;

      if (now - bullet.bornAt > BULLET_LIFETIME) continue;

      if (
        bullet.x < 0 || bullet.y < 0 ||
        bullet.x > physics.WORLD_WIDTH || bullet.y > physics.WORLD_HEIGHT
      ) continue;

      if (!bullet.phaseThrough && physics.checkWallCollision(bullet.x, bullet.y, BULLET_RADIUS, this.map)) {
        continue;
      }

      let hit = false;
      for (const player of this.players.values()) {
        if (!player.alive || player.id === bullet.ownerId) continue;
        if (physics.checkCircleCollision(bullet.x, bullet.y, BULLET_RADIUS, player.x, player.y, PLAYER_RADIUS)) {
          if (this.hasEffect(player, 'dodge') && Math.random() < 0.5) {
            hit = true;
            break;
          }
          this.damagePlayer(player, bullet.damage, bullet.ownerId);
          hit = true;
          break;
        }
      }

      if (!hit) remaining.push(bullet);
    }

    this.bullets = remaining;
  }

  damagePlayer(player, damage, attackerId) {
    player.hp -= damage;
    if (player.hp <= 0) {
      player.hp = 0;
      player.alive = false;
      player.deaths++;
      const attacker = this.getPlayerById(attackerId);
      if (attacker && attacker.alive) attacker.kills++;
    }
  }

  tickHealZones() {
    const now = this.tick * TICK_MS;
    this.healZones = this.healZones.filter((zone) => zone.expiresAt > now);

    for (const zone of this.healZones) {
      for (const player of this.players.values()) {
        if (!player.alive) continue;
        const dx = player.x - zone.x;
        const dy = player.y - zone.y;
        if (dx * dx + dy * dy <= zone.radius * zone.radius) {
          player.hp = Math.min(player.maxHp, player.hp + zone.healPerTick);
        }
      }
    }
  }

  tickTempWalls(now) {
    const expired = this.tempWalls.filter((w) => w.expiresAt <= now);
    this.tempWalls = this.tempWalls.filter((w) => w.expiresAt > now);

    for (const wall of expired) {
      for (const tile of wall.tiles) {
        if (this.map[tile.ty][tile.tx] === 1) {
          this.map[tile.ty][tile.tx] = 0;
        }
      }
    }
  }

  checkWinCondition() {
    if (this.ended) return;
    const alive = [...this.players.values()].filter((p) => p.alive);
    if (alive.length <= 1) {
      this.ended = true;
      this.stop();
      const winner = alive[0] || null;
      this.broadcast({
        type: 'game_over',
        winner: winner ? { id: winner.id, charId: winner.charId, kills: winner.kills } : null,
        scores: [...this.players.values()].map((p) => ({
          id: p.id,
          charId: p.charId,
          kills: p.kills,
          deaths: p.deaths,
          alive: p.alive,
        })),
      });
      require('./room').endGame(this.room);
    }
  }

  broadcastState() {
    const now = this.tick * TICK_MS;
    const players = [];
    for (const p of this.players.values()) {
      this.cleanEffects(p);
      players.push({
        id: p.id,
        charId: p.charId,
        x: p.x,
        y: p.y,
        dir: p.dir,
        hp: p.hp,
        maxHp: p.maxHp,
        alive: p.alive,
        kills: p.kills,
        effects: p.effects.map((e) => e.type),
      });
    }

    this.broadcast({
      type: 'state',
      tick: this.tick,
      players,
      bullets: this.bullets.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        dir: angleFromDir(b.dx, b.dy),
      })),
      healZones: this.healZones.map((z) => ({
        x: z.x,
        y: z.y,
        radius: z.radius,
        remaining: z.expiresAt - now,
      })),
      walls: this.tempWalls.flatMap((w) =>
        w.tiles.map((t) => ({
          id: w.id,
          tx: t.tx,
          ty: t.ty,
          remaining: w.expiresAt - now,
        }))
      ),
      items: [],
    });
  }
}

module.exports = GameLoop;


