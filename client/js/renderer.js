const { MAP, TILE_SIZE, WORLD_W, WORLD_H } = require('./map');
const { CHARACTERS, TEAM_COLORS } = require('./characters');
const assets = require('./assets');

let canvas = null;
let ctx = null;
const tempWallSet = new Set();
let animTime = 0;

let mapCache = null;
let mapCacheW = 0;
let mapCacheH = 0;
let mapCacheData = null;

const CHAR_IMG_MAP = {
  yan: 'char_yan', shenmu: 'char_shenmu', sutang: 'char_sutang',
  luyu: 'char_luyu', jiangxue: 'char_jiangxue', peijin: 'char_peijin',
};

function init(c) {
  canvas = c;
  ctx = canvas.getContext('2d');
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function computeCamera(player, screenW, screenH) {
  if (!player) return { x: 0, y: 0 };
  let cx = player.x - screenW / 2;
  let cy = player.y - screenH / 2;
  if (screenW >= WORLD_W) cx = (WORLD_W - screenW) / 2;
  else cx = clamp(cx, 0, WORLD_W - screenW);
  if (screenH >= WORLD_H) cy = (WORLD_H - screenH) / 2;
  else cy = clamp(cy, 0, WORLD_H - screenH);
  return { x: cx, y: cy };
}

function getTeamRingColor(team) {
  if (team === 0) return '#ff4d35';
  if (team === 1) return '#4da6ff';
  if (team === 2) return '#ffd700';
  return '#ffffff';
}

function buildMapCache(mapData) {
  const map = mapData || MAP;
  const w = map[0].length * TILE_SIZE;
  const h = map.length * TILE_SIZE;

  if (typeof OffscreenCanvas !== 'undefined') {
    mapCache = new OffscreenCanvas(w, h);
  } else {
    mapCache = document.createElement('canvas');
    mapCache.width = w;
    mapCache.height = h;
  }
  mapCacheW = w;
  mapCacheH = h;
  mapCacheData = map;

  const mc = mapCache.getContext('2d');
  const floorImg = assets.get('tile_floor');
  const wallImg = assets.get('tile_wall');
  const breakImg = assets.get('tile_breakable');

  for (let ty = 0; ty < map.length; ty++) {
    for (let tx = 0; tx < map[0].length; tx++) {
      const tile = map[ty][tx];
      const x = tx * TILE_SIZE;
      const y = ty * TILE_SIZE;

      if (tile === 0 || tile === 4) {
        if (floorImg && floorImg.complete) {
          mc.drawImage(floorImg, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          mc.fillStyle = '#1a1a26';
          mc.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
        if (tile === 4) {
          mc.globalAlpha = 0.55;
          mc.fillStyle = '#6644cc';
          mc.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          mc.globalAlpha = 1;
        }
      } else if (tile === 1) {
        if (wallImg && wallImg.complete) {
          mc.drawImage(wallImg, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          mc.fillStyle = '#3a3a4a';
          mc.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          mc.strokeStyle = '#555566';
          mc.lineWidth = 1;
          mc.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      } else if (tile === 2) {
        if (breakImg && breakImg.complete) {
          mc.drawImage(breakImg, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          mc.fillStyle = '#4a3a2a';
          mc.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          mc.strokeStyle = '#6a5a4a';
          mc.lineWidth = 1;
          mc.beginPath();
          mc.moveTo(x + 8, y + 10);
          mc.lineTo(x + TILE_SIZE - 8, y + TILE_SIZE - 10);
          mc.moveTo(x + TILE_SIZE - 10, y + 8);
          mc.lineTo(x + 10, y + TILE_SIZE - 8);
          mc.stroke();
        }
      } else if (tile === 3) {
        mc.fillStyle = '#3a1010';
        mc.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        mc.fillStyle = '#cc2222';
        const spikes = [[6,0],[16,0],[26,0]];
        for (const [sx] of spikes) {
          mc.beginPath();
          mc.moveTo(x + sx, y + TILE_SIZE - 4);
          mc.lineTo(x + sx - 4, y + TILE_SIZE - 14);
          mc.lineTo(x + sx + 4, y + TILE_SIZE - 14);
          mc.closePath();
          mc.fill();
        }
      } else if (tile === 5) {
        mc.fillStyle = '#dd3300';
        mc.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        mc.fillStyle = '#ff6600';
        mc.fillRect(x + 4, y + 8, TILE_SIZE - 8, 6);
        mc.fillStyle = '#ff8800';
        mc.fillRect(x + 8, y + 20, TILE_SIZE - 16, 4);
      }
    }
  }
}

function drawMap(camera, mapData) {
  const map = mapData || MAP;
  if (!mapCache || mapCacheData !== map) {
    buildMapCache(mapData);
  }

  const sx = Math.floor(camera.x);
  const sy = Math.floor(camera.y);
  const sw = Math.min(ctx.canvas.width, mapCacheW - sx);
  const sh = Math.min(ctx.canvas.height, mapCacheH - sy);

  if (sw > 0 && sh > 0) {
    ctx.drawImage(mapCache, sx, sy, sw, sh, 0, 0, sw, sh);
  }
}

function drawHealZones(zones, camera) {
  if (!zones) return;
  const healImg = assets.get('fx_heal');
  for (const zone of zones) {
    const sx = zone.x - camera.x;
    const sy = zone.y - camera.y;
    const pulse = 0.5 + 0.5 * Math.sin(animTime * 0.005);

    if (healImg && healImg.complete) {
      const sz = zone.radius * 2.2;
      ctx.globalAlpha = 0.7;
      ctx.drawImage(healImg, sx - sz / 2, sy - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.2 + pulse * 0.1;
      ctx.fillStyle = '#4dff88';
      ctx.beginPath();
      ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4dff88';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#4dff88';
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + animTime * 0.002;
      const dist = zone.radius * 0.4 + Math.sin(animTime * 0.004 + i * 1.7) * zone.radius * 0.2;
      const px = sx + Math.cos(angle) * dist;
      const py = sy + Math.sin(angle) * dist * 0.5;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawTempWalls(walls, camera) {
  if (!walls) return;
  tempWallSet.clear();
  const shimmer = 0.7 + 0.3 * Math.sin(animTime * 0.008);
  for (const wall of walls) {
    const key = wall.tx + ',' + wall.ty;
    if (tempWallSet.has(key)) continue;
    tempWallSet.add(key);
    const x = wall.tx * TILE_SIZE - camera.x;
    const y = wall.ty * TILE_SIZE - camera.y;
    const base = Math.floor(120 * shimmer);
    ctx.fillStyle = 'rgb(' + base + ',' + base + ',' + (base + 20) + ')';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    const highlight = Math.floor(180 * shimmer);
    ctx.fillStyle = 'rgba(' + highlight + ',' + highlight + ',' + (highlight + 30) + ',0.4)';
    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 4);
    ctx.strokeStyle = 'rgb(' + (base + 40) + ',' + (base + 40) + ',' + (base + 60) + ')';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  }
}

function drawImpacts(impacts, camera) {
  if (!impacts) return;
  for (const imp of impacts) {
    const sx = imp.x - camera.x;
    const sy = imp.y - camera.y;
    const maxLife = 200;
    const life = imp.remaining !== undefined ? imp.remaining : maxLife;
    const t = 1 - life / maxLife;
    const radius = 4 + t * 8;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = '#ffffaa';
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFxEvents(events, camera) {
  if (!events) return;
  for (const fx of events) {
    const sx = fx.x - camera.x;
    const sy = fx.y - camera.y;
    const maxLife = fx.type === 'disruption' ? 800 : 300;
    const life = fx.remaining !== undefined ? fx.remaining : maxLife;
    const t = 1 - life / maxLife;

    if (fx.type === 'disruption') {
      const radius = 20 + t * 150;
      ctx.globalAlpha = (1 - t) * 0.5;
      ctx.strokeStyle = '#4da6ff';
      ctx.lineWidth = 3 - t * 2;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - t) * 0.15;
      ctx.fillStyle = '#4da6ff';
      ctx.fill();
    } else if (fx.type === 'bounce') {
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.fillStyle = '#ffcc44';
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 2 * i) / 4 + t * 2;
        const dist = 3 + t * 12;
        ctx.beginPath();
        ctx.arc(sx + Math.cos(angle) * dist, sy + Math.sin(angle) * dist, 2 - t, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (fx.type === 'muzzle') {
      const dir = fx.dir || 0;
      const flareLen = 16 + (1 - t) * 10;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#ff4d35';
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(dir) * flareLen, sy + Math.sin(dir) * flareLen);
      ctx.lineTo(sx + Math.cos(dir + 0.5) * 6, sy + Math.sin(dir + 0.5) * 6);
      ctx.lineTo(sx + Math.cos(dir - 0.5) * 6, sy + Math.sin(dir - 0.5) * 6);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(player, camera, isLocal) {
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const charDef = CHARACTERS[player.charId] || { color: '#ffffff', name: '?' };
  const radius = 16;
  const spriteSize = 40;
  const alpha = player.alive === false ? 0.35 : 1;
  const charImg = assets.get(CHAR_IMG_MAP[player.charId]);
  const teamColor = getTeamRingColor(player.team);

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = teamColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px, py, radius + 6, 0, Math.PI * 2);
  ctx.stroke();

  if (isLocal) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, radius + 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (charImg && charImg.complete) {
    ctx.drawImage(charImg, px - spriteSize / 2, py - spriteSize / 2, spriteSize, spriteSize);
  } else {
    ctx.fillStyle = charDef.color;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const dir = player.dir || 0;
  ctx.fillStyle = charDef.color;
  ctx.globalAlpha = alpha * 0.7;
  ctx.beginPath();
  ctx.moveTo(px + Math.cos(dir) * (radius + 8), py + Math.sin(dir) * (radius + 8));
  ctx.lineTo(px + Math.cos(dir + 2.6) * (radius - 2), py + Math.sin(dir + 2.6) * (radius - 2));
  ctx.lineTo(px + Math.cos(dir - 2.6) * (radius - 2), py + Math.sin(dir - 2.6) * (radius - 2));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const nick = player.nickname || charDef.name;
  ctx.fillText(nick, px + 1, py - spriteSize / 2 - 1);
  ctx.fillStyle = '#eeeeee';
  ctx.fillText(nick, px, py - spriteSize / 2 - 2);
  if (player.nickname && player.nickname !== charDef.name) {
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(charDef.name, px, py - spriteSize / 2 - 14);
  }

  const barW = 32;
  const barH = 4;
  const hpPct = player.maxHp > 0 ? player.hp / player.maxHp : 0;
  ctx.fillStyle = '#333344';
  ctx.fillRect(px - barW / 2, py + spriteSize / 2 + 2, barW, barH);
  ctx.fillStyle = hpPct > 0.3 ? '#4dff88' : '#ff4d35';
  ctx.fillRect(px - barW / 2, py + spriteSize / 2 + 2, barW * hpPct, barH);

  ctx.restore();
}

function drawBullets(bullets, camera) {
  if (!bullets) return;
  ctx.fillStyle = '#ffaa44';
  for (const b of bullets) {
    const bx = b.x - camera.x;
    const by = b.y - camera.y;
    const dx = b.dx !== undefined ? b.dx : Math.cos(b.dir || 0);
    const dy = b.dy !== undefined ? b.dy : Math.sin(b.dir || 0);

    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(bx - dx * 6, by - dy * 6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawItems(items, camera) {
  if (!items) return;
  for (const item of items) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(item.x - camera.x, item.y - camera.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function render(state, myId, camera, screenW, screenH, mapData) {
  if (!ctx) return;
  animTime = Date.now();
  ctx.clearRect(0, 0, screenW, screenH);

  const localPlayer = state && state.players ? state.players.find((p) => p.id === myId) : null;
  const cam = camera || computeCamera(localPlayer, screenW, screenH);

  drawMap(cam, mapData);
  drawHealZones(state && state.healZones, cam);
  drawTempWalls(state && state.walls, cam);
  drawItems(state && state.items, cam);
  drawFxEvents(state && state.fxEvents, cam);
  drawImpacts(state && state.impacts, cam);

  if (state && state.bullets) drawBullets(state.bullets, cam);

  if (state && state.players) {
    const sorted = [...state.players].sort((a, b) => (a.id === myId ? 1 : 0) - (b.id === myId ? 1 : 0));
    for (const p of sorted) drawPlayer(p, cam, p.id === myId);
  }

  return cam;
}

module.exports = { init, render, computeCamera };
