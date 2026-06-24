const { MAP, TILE_SIZE, WORLD_W, WORLD_H } = require('./map');
const { CHARACTERS } = require('./characters');
const assets = require('./assets');

let canvas = null;
let ctx = null;
const tempWallSet = new Set();

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

function drawMap(camera) {
  const startTx = Math.max(0, Math.floor(camera.x / TILE_SIZE));
  const startTy = Math.max(0, Math.floor(camera.y / TILE_SIZE));
  const endTx = Math.min(MAP[0].length, Math.ceil((camera.x + ctx.canvas.width) / TILE_SIZE));
  const endTy = Math.min(MAP.length, Math.ceil((camera.y + ctx.canvas.height) / TILE_SIZE));

  const floorImg = assets.get('tile_floor');
  const wallImg = assets.get('tile_wall');
  const breakImg = assets.get('tile_breakable');

  for (let ty = startTy; ty < endTy; ty++) {
    for (let tx = startTx; tx < endTx; tx++) {
      const tile = MAP[ty][tx];
      const x = tx * TILE_SIZE - camera.x;
      const y = ty * TILE_SIZE - camera.y;

      if (tile === 0) {
        if (floorImg && floorImg.complete) {
          ctx.drawImage(floorImg, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = '#1a1a26';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
      } else if (tile === 1) {
        if (wallImg && wallImg.complete) {
          ctx.drawImage(wallImg, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = '#3a3a4a';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#555566';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      } else if (tile === 2) {
        if (breakImg && breakImg.complete) {
          ctx.drawImage(breakImg, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = '#4a3a2a';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#6a5a4a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 8, y + 10);
          ctx.lineTo(x + TILE_SIZE - 8, y + TILE_SIZE - 10);
          ctx.moveTo(x + TILE_SIZE - 10, y + 8);
          ctx.lineTo(x + 10, y + TILE_SIZE - 8);
          ctx.stroke();
        }
      }
    }
  }
}

function drawHealZones(zones, camera) {
  if (!zones) return;
  const healImg = assets.get('fx_heal');
  for (const zone of zones) {
    const sx = zone.x - camera.x;
    const sy = zone.y - camera.y;
    if (healImg && healImg.complete) {
      const sz = zone.radius * 2.2;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.drawImage(healImg, sx - sz / 2, sy - sz / 2, sz, sz);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#4dff88';
      ctx.beginPath();
      ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#4dff88';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawTempWalls(walls, camera) {
  if (!walls) return;
  tempWallSet.clear();
  for (const wall of walls) {
    const key = wall.tx + ',' + wall.ty;
    if (tempWallSet.has(key)) continue;
    tempWallSet.add(key);
    const x = wall.tx * TILE_SIZE - camera.x;
    const y = wall.ty * TILE_SIZE - camera.y;
    ctx.fillStyle = '#888899';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = '#aaaabb';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  }
}

function drawPlayer(player, camera, isLocal) {
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const charDef = CHARACTERS[player.charId] || { color: '#ffffff', name: '?' };
  const radius = 16;
  const spriteSize = 40;
  const alpha = player.alive === false ? 0.35 : 1;
  const charImg = assets.get(CHAR_IMG_MAP[player.charId]);

  ctx.save();
  ctx.globalAlpha = alpha;

  if (isLocal) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, radius + 4, 0, Math.PI * 2);
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

  ctx.fillStyle = '#eeeeee';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 3;
  ctx.fillText(charDef.name, px, py - spriteSize / 2 - 2);
  ctx.shadowBlur = 0;

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
  for (const b of bullets) {
    ctx.fillStyle = '#ffaa44';
    ctx.shadowColor = '#ffaa44';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(b.x - camera.x, b.y - camera.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
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

function render(state, myId, camera, screenW, screenH) {
  if (!ctx) return;
  ctx.clearRect(0, 0, screenW, screenH);

  const localPlayer = state && state.players ? state.players.find((p) => p.id === myId) : null;
  const cam = camera || computeCamera(localPlayer, screenW, screenH);

  drawMap(cam);
  drawHealZones(state && state.healZones, cam);
  drawTempWalls(state && state.walls, cam);
  drawItems(state && state.items, cam);

  if (state && state.bullets) drawBullets(state.bullets, cam);

  if (state && state.players) {
    const sorted = [...state.players].sort((a, b) => (a.id === myId ? 1 : 0) - (b.id === myId ? 1 : 0));
    for (const p of sorted) drawPlayer(p, cam, p.id === myId);
  }

  return cam;
}

module.exports = { init, render, computeCamera };
