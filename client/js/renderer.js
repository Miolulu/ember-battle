const { MAP, TILE_SIZE, WORLD_W, WORLD_H } = require('./map');
const { CHARACTERS, TEAM_COLORS } = require('./characters');
const assets = require('./assets');

let canvas = null;
let ctx = null;
const tempWallSet = new Set();
let animTime = 0;

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

function drawMap(camera, mapData) {
  const map = mapData || MAP;
  const startTx = Math.max(0, Math.floor(camera.x / TILE_SIZE));
  const startTy = Math.max(0, Math.floor(camera.y / TILE_SIZE));
  const endTx = Math.min(map[0].length, Math.ceil((camera.x + ctx.canvas.width) / TILE_SIZE));
  const endTy = Math.min(map.length, Math.ceil((camera.y + ctx.canvas.height) / TILE_SIZE));

  const floorImg = assets.get('tile_floor');
  const wallImg = assets.get('tile_wall');
  const breakImg = assets.get('tile_breakable');

  for (let ty = startTy; ty < endTy; ty++) {
    for (let tx = startTx; tx < endTx; tx++) {
      const tile = map[ty][tx];
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
      } else if (tile === 3) {
        ctx.fillStyle = '#3a1010';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        const spikePulse = 0.5 + 0.5 * Math.sin(animTime * 0.01 + tx + ty);
        ctx.fillStyle = '#cc2222';
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            const sx = x + 6 + i * 10;
            const sy = y + TILE_SIZE - 4 - spikePulse * 3;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - 4, sy - 8 - spikePulse * 2);
            ctx.lineTo(sx + 4, sy - 8 - spikePulse * 2);
            ctx.closePath();
            ctx.fill();
          }
        }
      } else if (tile === 4) {
        if (floorImg && floorImg.complete) {
          ctx.drawImage(floorImg, x, y, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = '#1a1a26';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
        const bubble = Math.sin(animTime * 0.005 + tx * 2 + ty);
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#6644cc';
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.globalAlpha = 0.35 + bubble * 0.15;
        ctx.fillStyle = '#8866ee';
        ctx.beginPath();
        ctx.arc(x + 12 + bubble * 4, y + 14, 5 + bubble * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 26 - bubble * 3, y + 24, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 18, y + 30 + bubble * 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (tile === 5) {
        const flow = animTime * 0.003 + tx * 0.5 + ty * 0.3;
        const grad = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
        grad.addColorStop(0, '#ff4400');
        grad.addColorStop(0.5 + Math.sin(flow) * 0.2, '#ff8800');
        grad.addColorStop(1, '#cc2200');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#ffaa44';
        ctx.globalAlpha = 0.4 + Math.sin(flow * 2) * 0.2;
        ctx.fillRect(x + 4, y + 8 + Math.sin(flow) * 4, TILE_SIZE - 8, 6);
        ctx.globalAlpha = 1;
        for (let e = 0; e < 3; e++) {
          const rise = (animTime * 0.04 + e * 30 + tx * 17) % 30;
          const ex = x + 8 + e * 10 + Math.sin(flow + e) * 3;
          const ey = y + TILE_SIZE - rise;
          ctx.globalAlpha = 1 - rise / 30;
          ctx.fillStyle = '#ffcc66';
          ctx.beginPath();
          ctx.arc(ex, ey, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
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
    const pulse = 0.5 + 0.5 * Math.sin(animTime * 0.005);

    if (healImg && healImg.complete) {
      const sz = zone.radius * 2.2;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.drawImage(healImg, sx - sz / 2, sy - sz / 2, sz, sz);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.15 + pulse * 0.15;
      ctx.fillStyle = '#4dff88';
      ctx.beginPath();
      ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4 + pulse * 0.2;
      ctx.strokeStyle = '#4dff88';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + animTime * 0.002;
      const dist = (zone.radius * 0.3) + (Math.sin(animTime * 0.004 + i * 1.7) * 0.5 + 0.5) * zone.radius * 0.5;
      const rise = (animTime * 0.03 + i * 40) % (zone.radius * 1.2);
      const px = sx + Math.cos(angle) * dist;
      const py = sy + Math.sin(angle) * dist * 0.5 - rise;
      const alpha = 1 - rise / (zone.radius * 1.2);
      if (alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = '#4dff88';
      ctx.beginPath();
      ctx.arc(px, py, 2 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
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
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = '#ffffaa';
    ctx.shadowColor = '#ffaa44';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(sx, sy, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
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
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.6;
      ctx.strokeStyle = '#4da6ff';
      ctx.lineWidth = 3 - t * 2;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = (1 - t) * 0.3;
      ctx.fillStyle = '#4da6ff';
      ctx.beginPath();
      ctx.arc(sx, sy, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (fx.type === 'bounce') {
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.9;
      const sparkCount = 6;
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + t * 2;
        const dist = 3 + t * 14;
        const sparkX = sx + Math.cos(angle) * dist;
        const sparkY = sy + Math.sin(angle) * dist;
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#ffcc44';
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 2 - t * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffcc44';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(sx, sy, 3 * (1 - t), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (fx.type === 'muzzle') {
      const dir = fx.dir || 0;
      const flareLen = 20 + (1 - t) * 15;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#ff4d35';
      ctx.shadowColor = '#ff4d35';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(
        sx + Math.cos(dir) * flareLen,
        sy + Math.sin(dir) * flareLen
      );
      ctx.lineTo(
        sx + Math.cos(dir + 0.5) * 8,
        sy + Math.sin(dir + 0.5) * 8
      );
      ctx.lineTo(
        sx + Math.cos(dir - 0.5) * 8,
        sy + Math.sin(dir - 0.5) * 8
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
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

  ctx.fillStyle = '#eeeeee';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 3;
  const nick = player.nickname || charDef.name;
  ctx.fillText(nick, px, py - spriteSize / 2 - 2);
  if (player.nickname && player.nickname !== charDef.name) {
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(charDef.name, px, py - spriteSize / 2 - 14);
  }
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
    const bx = b.x - camera.x;
    const by = b.y - camera.y;
    const dx = b.dx !== undefined ? b.dx : Math.cos(b.dir || 0);
    const dy = b.dy !== undefined ? b.dy : Math.sin(b.dir || 0);

    for (let i = 1; i <= 4; i++) {
      const trailAlpha = 0.5 - i * 0.12;
      const trailR = 3 - i * 0.5;
      ctx.save();
      ctx.globalAlpha = trailAlpha;
      ctx.fillStyle = '#ffaa44';
      ctx.beginPath();
      ctx.arc(bx - dx * i * 6, by - dy * i * 6, trailR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#ffaa44';
    ctx.shadowColor = '#ffaa44';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
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
