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

function createEmptyMap() {
  return Array.from({ length: physics.MAP_HEIGHT }, () =>
    Array(physics.MAP_WIDTH).fill(0)
  );
}

function addOuterWalls(map) {
  for (let x = 0; x < physics.MAP_WIDTH; x++) {
    map[0][x] = 1;
    map[physics.MAP_HEIGHT - 1][x] = 1;
  }
  for (let y = 0; y < physics.MAP_HEIGHT; y++) {
    map[y][0] = 1;
    map[y][physics.MAP_WIDTH - 1] = 1;
  }
}

function addCrossCover(map, cx, cy, size) {
  for (let dx = -size; dx <= size; dx++) {
    if (map[cy][cx + dx] === 0) map[cy][cx + dx] = 2;
  }
  for (let dy = -size; dy <= size; dy++) {
    if (map[cy + dy][cx] === 0) map[cy + dy][cx] = 2;
  }
}

function createEasyMap() {
  const map = createEmptyMap();
  addOuterWalls(map);
  addCrossCover(map, 7, 5, 1);
  addCrossCover(map, 22, 5, 1);
  addCrossCover(map, 7, 14, 1);
  addCrossCover(map, 22, 14, 1);
  return map;
}

function createHardMap() {
  const map = createEmptyMap();
  addOuterWalls(map);

  for (let x = 5; x <= 24; x++) map[6][x] = 1;
  for (let x = 5; x <= 24; x++) map[13][x] = 1;
  map[6][10] = 0; map[6][19] = 0;
  map[13][10] = 0; map[13][19] = 0;

  for (let y = 7; y <= 12; y++) {
    map[y][10] = 1;
    map[y][19] = 1;
  }
  map[9][10] = 0;
  map[10][19] = 0;

  for (let x = 12; x <= 17; x++) map[9][x] = 2;
  for (let x = 12; x <= 17; x++) map[10][x] = 2;
  map[8][14] = 2; map[8][15] = 2;
  map[11][14] = 2; map[11][15] = 2;

  const spikes = [[8, 10], [21, 10], [8, 9], [21, 9], [14, 6], [15, 13]];
  spikes.forEach(([tx, ty]) => { if (map[ty][tx] === 0) map[ty][tx] = 3; });

  const slows = [[14, 4], [15, 16], [5, 9]];
  slows.forEach(([tx, ty]) => { if (map[ty][tx] === 0) map[ty][tx] = 4; });

  return map;
}

function createHellMap() {
  const map = createEmptyMap();
  addOuterWalls(map);

  for (let y = 2; y <= 17; y++) {
    if (y % 3 !== 0) {
      for (let x = 3; x <= 26; x += 6) {
        if (x + 2 < physics.MAP_WIDTH - 1) {
          map[y][x] = 1;
          map[y][x + 1] = 1;
          map[y][x + 2] = 1;
        }
      }
    }
  }

  for (let x = 4; x <= 25; x += 5) {
    map[4][x] = 0;
    map[8][x] = 0;
    map[12][x] = 0;
    map[16][x] = 0;
  }

  for (let y = 5; y <= 15; y += 2) {
    map[y][14] = 1;
    map[y][15] = 1;
  }
  map[8][14] = 0; map[8][15] = 0;
  map[12][14] = 0; map[12][15] = 0;

  const destructibles = [
    [6, 5], [7, 5], [22, 5], [23, 5],
    [6, 14], [7, 14], [22, 14], [23, 14],
    [10, 9], [11, 9], [18, 9], [19, 9],
    [10, 10], [19, 10],
  ];
  destructibles.forEach(([tx, ty]) => { if (map[ty][tx] === 0) map[ty][tx] = 2; });

  const spikes = [
    [5, 7], [24, 7], [5, 12], [24, 12],
    [10, 6], [19, 6], [10, 13], [19, 13],
    [14, 5], [15, 14],
  ];
  spikes.forEach(([tx, ty]) => { if (map[ty][tx] === 0) map[ty][tx] = 3; });

  const lavas = [[13, 9], [16, 9], [13, 10], [16, 10], [14, 7]];
  lavas.forEach(([tx, ty]) => { if (map[ty][tx] === 0) map[ty][tx] = 5; });

  const slows = [[7, 9], [22, 9], [14, 3], [15, 16]];
  slows.forEach(([tx, ty]) => { if (map[ty][tx] === 0) map[ty][tx] = 4; });

  return map;
}

function createMap(difficulty) {
  switch (difficulty) {
    case 'hard': return createHardMap();
    case 'hell': return createHellMap();
    default: return createEasyMap();
  }
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
  constructor(room, playerList, mapDifficulty, broadcast) {
    this.room = room;
    this.broadcast = broadcast;
    this.tick = 0;
    this.map = createMap(mapDifficulty || 'easy');
    this.bullets = [];
    this.healZones = [];
    this.tempWalls = [];
    this.inputs = new Map();
    this.interval = null;
    this.ended = false;
    this.fxEvents = [];

    this.players = new Map();
    playerList.forEach((entry, i) => {
      const def = CHARACTERS[entry.charId];
      const spawn = SPAWN_POINTS[i % SPAWN_POINTS.length];
      this.players.set(entry.ws, {
        ws: entry.ws,
        id: entry.id,
        nickname: entry.nickname || entry.id,
        charId: entry.charId,
        team: entry.team !== undefined ? entry.team : -1,
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

  addFxEvent(type, x, y, extra) {
    this.fxEvents.push({
      type,
      x,
      y,
      expiresAt: this.tick * TICK_MS + (extra && extra.duration ? extra.duration : 400),
      ...extra,
    });
  }

  cleanFxEvents() {
    const now = this.tick * TICK_MS;
    this.fxEvents = this.fxEvents.filter((e) => e.expiresAt > now);
  }

  isSameTeam(a, b) {
    return a.team >= 0 && b.team >= 0 && a.team === b.team;
  }

  isEnemy(a, b) {
    if (!a.alive || !b.alive) return false;
    if (a.team < 0 || b.team < 0) return a.id !== b.id;
    return a.team !== b.team;
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
    this.processTrapDamage();
    this.moveBullets();
    this.tickHealZones();
    this.tickTempWalls(now);
    this.checkWinCondition();
    this.cleanFxEvents();
    this.broadcastState();
  }

  processInputs(now) {
    for (const [ws, input] of this.inputs) {
      const player = this.players.get(ws);
      if (!player || !player.alive) continue;

      const def = CHARACTERS[player.charId];
      const dir = normalize(input.dir[0], input.dir[1]);
      const isMoving = dir.x !== 0 || dir.y !== 0;
      if (isMoving) {
        player.dir = angleFromDir(dir.x, dir.y);
      }

      if (input.shoot && player.shootCooldown <= 0) {
        const shootDx = isMoving ? dir.x : Math.cos(player.dir);
        const shootDy = isMoving ? dir.y : Math.sin(player.dir);
        this.spawnBullet(player, shootDx, shootDy, def.damage, def.bulletSpeed, false);
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

      const tx = Math.floor(player.x / physics.TILE_SIZE);
      const ty = Math.floor(player.y / physics.TILE_SIZE);
      const tile = physics.tileAt(this.map, tx, ty);
      const speedMult = tile === 4 ? 0.5 : 1;

      let nx = player.x + move.x * def.speed * speedMult;
      let ny = player.y + move.y * def.speed * speedMult;

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

  processTrapDamage() {
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      const tx = Math.floor(player.x / physics.TILE_SIZE);
      const ty = Math.floor(player.y / physics.TILE_SIZE);
      const tile = physics.tileAt(this.map, tx, ty);
      if (tile === 3) {
        player.hp -= 2;
        if (player.hp <= 0) { player.hp = 0; player.alive = false; player.deaths++; }
      } else if (tile === 5) {
        player.hp -= 5;
        if (player.hp <= 0) { player.hp = 0; player.alive = false; player.deaths++; }
      }
    }
  }

  spawnBullet(owner, dx, dy, damage, speed, phaseThrough, maxBounces) {
    const dir = normalize(dx, dy);
    const offset = PLAYER_RADIUS + BULLET_RADIUS + 2;
    this.bullets.push({
      id: nextBulletId++,
      ownerId: owner.id,
      ownerTeam: owner.team,
      x: owner.x + dir.x * offset,
      y: owner.y + dir.y * offset,
      dx: dir.x,
      dy: dir.y,
      speed,
      damage,
      phaseThrough,
      bounces: maxBounces !== undefined ? maxBounces : 2,
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
    this.addFxEvent('muzzle', player.x, player.y, { dir: player.dir, duration: 300 });
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
    this.addFxEvent('disruption', player.x, player.y, { duration: 800 });
    for (const other of this.players.values()) {
      if (!this.isEnemy(player, other)) continue;
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
      ownerTeam: player.team,
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
      const prevX = bullet.x;
      const prevY = bullet.y;
      bullet.x += bullet.dx * bullet.speed;
      bullet.y += bullet.dy * bullet.speed;

      if (now - bullet.bornAt > BULLET_LIFETIME) continue;

      if (
        bullet.x < 0 || bullet.y < 0 ||
        bullet.x > physics.WORLD_WIDTH || bullet.y > physics.WORLD_HEIGHT
      ) continue;

      if (!bullet.phaseThrough && physics.checkWallCollision(bullet.x, bullet.y, BULLET_RADIUS, this.map)) {
        if (bullet.bounces > 0) {
          bullet.bounces--;
          const tryX = { x: bullet.x, y: prevY };
          const tryY = { x: prevX, y: bullet.y };
          const hitX = physics.checkWallCollision(tryX.x, tryX.y, BULLET_RADIUS, this.map);
          const hitY = physics.checkWallCollision(tryY.x, tryY.y, BULLET_RADIUS, this.map);

          if (hitX && hitY) {
            bullet.dx = -bullet.dx;
            bullet.dy = -bullet.dy;
          } else if (hitX) {
            bullet.dx = -bullet.dx;
          } else {
            bullet.dy = -bullet.dy;
          }

          bullet.x = prevX + bullet.dx * bullet.speed;
          bullet.y = prevY + bullet.dy * bullet.speed;
          bullet.damage = Math.round(bullet.damage * 0.8);
          this.addFxEvent('bounce', bullet.x, bullet.y, { duration: 150 });
          remaining.push(bullet);
        } else {
          this.addFxEvent('impact', bullet.x, bullet.y, { duration: 200 });
        }
        continue;
      }

      let hit = false;
      for (const player of this.players.values()) {
        if (!player.alive || player.id === bullet.ownerId) continue;
        if (bullet.ownerTeam >= 0 && player.team === bullet.ownerTeam) continue;
        if (physics.checkCircleCollision(bullet.x, bullet.y, BULLET_RADIUS, player.x, player.y, PLAYER_RADIUS)) {
          if (this.hasEffect(player, 'dodge') && Math.random() < 0.5) {
            this.addFxEvent('impact', bullet.x, bullet.y, { duration: 200 });
            hit = true;
            break;
          }
          this.addFxEvent('impact', bullet.x, bullet.y, { duration: 200 });
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
        if (zone.ownerTeam >= 0) {
          if (player.team !== zone.ownerTeam) continue;
        } else if (player.id !== zone.ownerId) {
          continue;
        }
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
    const allPlayers = [...this.players.values()];
    const alive = allPlayers.filter((p) => p.alive);
    if (allPlayers.length <= 1) return;

    const hasTeams = allPlayers.some((p) => p.team >= 0);

    if (!hasTeams) {
      if (alive.length <= 1) {
        this.endGame(alive[0] || null, null);
      }
      return;
    }

    const aliveTeams = new Set(alive.map((p) => p.team));
    if (aliveTeams.size <= 1) {
      const winningTeam = aliveTeams.size === 1 ? [...aliveTeams][0] : null;
      const winner = winningTeam !== null ? alive.find((p) => p.team === winningTeam) : null;
      this.endGame(winner || null, winningTeam);
    }
  }

  endGame(winner, winningTeam) {
    if (this.ended) return;
    this.ended = true;
    this.stop();
    this.broadcast({
      type: 'game_over',
      winner: winner ? { id: winner.id, nickname: winner.nickname, charId: winner.charId, kills: winner.kills, team: winner.team } : null,
      winningTeam,
      scores: [...this.players.values()].map((p) => ({
        id: p.id,
        nickname: p.nickname || p.id,
        charId: p.charId,
        kills: p.kills,
        deaths: p.deaths,
        alive: p.alive,
        team: p.team,
      })),
    });
    require('./room').endGame(this.room);
  }

  broadcastState() {
    const now = this.tick * TICK_MS;
    const players = [];
    for (const p of this.players.values()) {
      this.cleanEffects(p);
      players.push({
        id: p.id,
        nickname: p.nickname || p.id,
        charId: p.charId,
        team: p.team,
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
        dx: b.dx,
        dy: b.dy,
        ownerId: b.ownerId,
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
      impacts: this.fxEvents.filter((e) => e.type === 'impact').map((e) => ({
        x: e.x, y: e.y, remaining: e.expiresAt - now,
      })),
      fxEvents: this.fxEvents.map((e) => ({
        type: e.type,
        x: e.x,
        y: e.y,
        dir: e.dir,
        remaining: e.expiresAt - now,
      })),
      items: [],
    });
  }
}

module.exports = GameLoop;


