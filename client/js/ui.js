const { CHARACTERS, CHAR_LIST } = require('./characters');
const assets = require('./assets');

const ACCENT = '#ff4d35';
const BG = '#0d0d14';
const PANEL = '#1a1a26';
const TEXT = '#eeeeee';
const MUTED = '#888899';

const CHAR_IMG_MAP = {
  yan: 'char_yan', shenmu: 'char_shenmu', sutang: 'char_sutang',
  luyu: 'char_luyu', jiangxue: 'char_jiangxue', peijin: 'char_peijin',
};
const SKILL_IMG_MAP = {
  yan: 'skill_yan', shenmu: 'skill_shenmu', sutang: 'skill_sutang',
  luyu: 'skill_luyu', jiangxue: 'skill_jiangxue', peijin: 'skill_peijin',
};

function fillBg(ctx, w, h) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
}

function drawImgButton(ctx, x, y, bw, bh, imgKey, label, primary) {
  const img = assets.get(imgKey);
  if (img && img.complete) {
    ctx.drawImage(img, x, y, bw, bh);
  } else {
    drawButton(ctx, x, y, bw, bh, label, primary);
  }
}

function drawButton(ctx, x, y, bw, bh, label, primary) {
  ctx.fillStyle = primary ? ACCENT : PANEL;
  ctx.strokeStyle = primary ? ACCENT : '#333344';
  ctx.lineWidth = 2;
  const r = 6;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + bw - r, y);
  ctx.quadraticCurveTo(x + bw, y, x + bw, y + r);
  ctx.lineTo(x + bw, y + bh - r);
  ctx.quadraticCurveTo(x + bw, y + bh, x + bw - r, y + bh);
  ctx.lineTo(x + r, y + bh);
  ctx.quadraticCurveTo(x, y + bh, x, y + bh - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = primary ? '#ffffff' : TEXT;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + bw / 2, y + bh / 2);
}

function hitRect(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function drawLobby(ctx, w, h, state) {
  fillBg(ctx, w, h);

  const logoImg = assets.get('logo');
  if (logoImg && logoImg.complete) {
    const lw = Math.min(w * 0.5, 360);
    const lh = lw * (logoImg.height / logoImg.width);
    ctx.drawImage(logoImg, w / 2 - lw / 2, h * 0.08, lw, lh);
  } else {
    ctx.fillStyle = ACCENT;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('余烬·战场', w / 2, h * 0.2);
  }

  ctx.fillStyle = MUTED;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Ember Battlefield', w / 2, h * 0.33);

  if (state.error) {
    ctx.fillStyle = ACCENT;
    ctx.font = '14px sans-serif';
    ctx.fillText(state.error, w / 2, h * 0.39);
  }

  const btnW = 180;
  const btnH = 44;
  const cx = w / 2 - btnW / 2;

  drawImgButton(ctx, cx, h * 0.45, btnW, btnH, 'btn_create', '创建房间', true);
  drawImgButton(ctx, cx, h * 0.55, btnW, btnH, 'btn_join', '加入房间', false);

  if (state.joinMode) {
    ctx.fillStyle = PANEL;
    ctx.fillRect(w / 2 - 100, h * 0.66, 200, 44);
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - 100, h * 0.66, 200, 44);
    ctx.fillStyle = TEXT;
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((state.joinCode || '____').replace(/_/g, ' '), w / 2, h * 0.66 + 26);

    drawButton(ctx, cx, h * 0.76, btnW, btnH, '确认加入', true);

    const keys = ['1','2','3','4','5','6','7','8','9','0','←'];
    const kw = 36;
    const kh = 36;
    const startX = w / 2 - (keys.length * (kw + 4)) / 2;
    const startY = h * 0.84;
    keys.forEach((k, i) => {
      const kx = startX + i * (kw + 4);
      ctx.fillStyle = '#222233';
      ctx.fillRect(kx, startY, kw, kh);
      ctx.strokeStyle = '#444455';
      ctx.lineWidth = 1;
      ctx.strokeRect(kx, startY, kw, kh);
      ctx.fillStyle = TEXT;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(k, kx + kw / 2, startY + kh / 2);
    });
  }

  if (state.connecting) {
    ctx.fillStyle = MUTED;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('连接中...', w / 2, h * 0.92);
  }
}

function drawWaiting(ctx, w, h, state) {
  fillBg(ctx, w, h);

  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('等待房间', w / 2, h * 0.12);

  ctx.fillStyle = TEXT;
  ctx.font = '20px monospace';
  ctx.fillText('房间号: ' + (state.roomCode || '----'), w / 2, h * 0.22);

  ctx.fillStyle = MUTED;
  ctx.font = '14px sans-serif';
  ctx.fillText('玩家 (' + (state.players ? state.players.length : 0) + '/6)', w / 2, h * 0.32);

  const listY = h * 0.38;
  if (state.players) {
    state.players.forEach((p, i) => {
      const charDef = p.charId ? CHARACTERS[p.charId] : null;
      const charImg = p.charId ? assets.get(CHAR_IMG_MAP[p.charId]) : null;
      const y = listY + i * 42;

      if (charImg && charImg.complete) {
        ctx.drawImage(charImg, w / 2 - 140, y - 16, 32, 32);
      } else {
        ctx.fillStyle = charDef ? charDef.color : '#444455';
        ctx.beginPath();
        ctx.arc(w / 2 - 120, y, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = TEXT;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      const name = charDef ? charDef.name : p.id;
      const hostTag = p.isHost ? ' [房主]' : '';
      ctx.fillText(name + hostTag, w / 2 - 100, y + 5);
    });
  }

  if (state.isHost) {
    drawImgButton(ctx, w / 2 - 90, h * 0.78, 180, 44, 'btn_start', '开始游戏', true);
  } else {
    ctx.fillStyle = MUTED;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('等待房主开始...', w / 2, h * 0.8);
  }
}

function drawCharSelect(ctx, w, h, state) {
  fillBg(ctx, w, h);

  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('选择角色', w / 2, h * 0.08);

  const cardW = w / 6 - 12;
  const cardH = h * 0.58;
  const startX = 8;
  const startY = h * 0.13;

  CHAR_LIST.forEach((id, i) => {
    const c = CHARACTERS[id];
    const taken = state.takenChars && state.takenChars.includes(id);
    const selected = state.selectedChar === id;
    const x = startX + i * (cardW + 8);
    const y = startY;

    ctx.fillStyle = selected ? '#2a1a1a' : PANEL;
    ctx.strokeStyle = selected ? ACCENT : (taken ? '#333333' : '#333344');
    ctx.lineWidth = selected ? 3 : 1;
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeRect(x, y, cardW, cardH);

    ctx.globalAlpha = taken ? 0.35 : 1;

    const charImg = assets.get(CHAR_IMG_MAP[id]);
    const imgSize = Math.min(cardW * 0.7, 60);
    if (charImg && charImg.complete) {
      ctx.drawImage(charImg, x + (cardW - imgSize) / 2, y + cardH * 0.06, imgSize, imgSize);
    } else {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(x + cardW / 2, y + cardH * 0.2, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    const skillImg = assets.get(SKILL_IMG_MAP[id]);
    const skillSize = 28;
    if (skillImg && skillImg.complete) {
      ctx.drawImage(skillImg, x + (cardW - skillSize) / 2, y + cardH * 0.52, skillSize, skillSize);
    }

    ctx.fillStyle = TEXT;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.name, x + cardW / 2, y + cardH * 0.46);
    ctx.fillStyle = MUTED;
    ctx.font = '10px sans-serif';
    ctx.fillText(c.role, x + cardW / 2, y + cardH * 0.73);
    ctx.fillText(c.skillName, x + cardW / 2, y + cardH * 0.81);

    // Stats bars
    const statY = y + cardH * 0.86;
    const barMaxW = cardW * 0.7;
    const barX = x + (cardW - barMaxW) / 2;
    ctx.fillStyle = '#333344';
    ctx.fillRect(barX, statY, barMaxW, 3);
    ctx.fillStyle = c.color;
    ctx.fillRect(barX, statY, barMaxW * (c.maxHp / 140), 3);

    ctx.globalAlpha = 1;

    if (taken) {
      ctx.fillStyle = ACCENT;
      ctx.font = '12px sans-serif';
      ctx.fillText('已选', x + cardW / 2, y + cardH * 0.95);
    }
  });

  const readyLabel = state.ready ? '已准备' : '准备';
  if (!state.ready) {
    drawImgButton(ctx, w / 2 - 80, h * 0.82, 160, 44, 'btn_ready', readyLabel, true);
  } else {
    drawButton(ctx, w / 2 - 80, h * 0.82, 160, 44, readyLabel, false);
  }
}

function drawHUD(ctx, w, h, gameState, myId) {
  if (!gameState || !gameState.players) return;

  const panelW = 150;
  const panelX = w - panelW - 8;
  let panelY = 8;

  ctx.fillStyle = 'rgba(13,13,20,0.8)';
  ctx.fillRect(panelX, panelY, panelW, gameState.players.length * 30 + 8);

  gameState.players.forEach((p) => {
    const charDef = CHARACTERS[p.charId] || { name: '?', color: '#fff' };
    const isMe = p.id === myId;

    const charImg = assets.get(CHAR_IMG_MAP[p.charId]);
    if (charImg && charImg.complete) {
      ctx.drawImage(charImg, panelX + 4, panelY + 3, 22, 22);
    } else {
      ctx.fillStyle = charDef.color;
      ctx.beginPath();
      ctx.arc(panelX + 14, panelY + 16, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isMe ? ACCENT : TEXT;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(charDef.name, panelX + 30, panelY + 12);

    const hpPct = p.maxHp > 0 ? p.hp / p.maxHp : 0;
    ctx.fillStyle = '#333344';
    ctx.fillRect(panelX + 30, panelY + 17, 100, 4);
    ctx.fillStyle = hpPct > 0.3 ? '#4dff88' : ACCENT;
    ctx.fillRect(panelX + 30, panelY + 17, 100 * hpPct, 4);

    if (!p.alive) {
      ctx.fillStyle = ACCENT;
      ctx.font = '10px sans-serif';
      ctx.fillText('阵亡', panelX + 30, panelY + 27);
    }

    panelY += 30;
  });

  if (gameState.killFeed && gameState.killFeed.length) {
    ctx.fillStyle = 'rgba(13,13,20,0.6)';
    ctx.fillRect(8, 8, 220, gameState.killFeed.length * 18 + 8);
    gameState.killFeed.slice(0, 5).forEach((msg, i) => {
      ctx.fillStyle = MUTED;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(msg, 14, 22 + i * 18);
    });
  }
}

function drawGameOver(ctx, w, h, results) {
  fillBg(ctx, w, h);

  const won = results && results.won;
  ctx.fillStyle = won ? '#4dff88' : ACCENT;
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(won ? '胜利!' : '战斗结束', w / 2, h * 0.15);

  ctx.fillStyle = TEXT;
  ctx.font = '16px sans-serif';
  ctx.fillText('排名', w / 2, h * 0.28);

  if (results && results.scores) {
    const sorted = [...results.scores].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
    sorted.forEach((s, i) => {
      const charDef = CHARACTERS[s.charId] || { name: '?', color: '#fff' };
      const charImg = assets.get(CHAR_IMG_MAP[s.charId]);
      const y = h * 0.35 + i * 44;

      if (charImg && charImg.complete) {
        ctx.drawImage(charImg, w / 2 - 150, y - 16, 36, 36);
      } else {
        ctx.fillStyle = charDef.color;
        ctx.beginPath();
        ctx.arc(w / 2 - 130, y, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = TEXT;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText((i + 1) + '. ' + charDef.name, w / 2 - 110, y + 5);
      ctx.fillStyle = MUTED;
      ctx.font = '12px sans-serif';
      ctx.fillText('击杀 ' + s.kills + ' / 死亡 ' + s.deaths, w / 2 + 20, y + 5);
    });
  }

  drawButton(ctx, w / 2 - 90, h * 0.82, 180, 44, '返回大厅', true);
}

function handleTouch(x, y, scene, state) {
  const w = state.screenW || 800;
  const h = state.screenH || 480;

  if (scene === 'lobby') {
    const btnW = 180;
    const btnH = 44;
    const cx = w / 2 - btnW / 2;

    if (hitRect(x, y, cx, h * 0.45, btnW, btnH)) {
      return { action: 'create_room' };
    }
    if (hitRect(x, y, cx, h * 0.55, btnW, btnH)) {
      return { action: 'toggle_join' };
    }
    if (state.joinMode) {
      if (hitRect(x, y, cx, h * 0.76, btnW, btnH) && (state.joinCode || '').length === 4) {
        return { action: 'join_room', code: state.joinCode };
      }
      const keys = ['1','2','3','4','5','6','7','8','9','0','←'];
      const kw = 36;
      const kh = 36;
      const startX = w / 2 - (keys.length * (kw + 4)) / 2;
      const startY = h * 0.84;
      for (let i = 0; i < keys.length; i++) {
        const kx = startX + i * (kw + 4);
        if (hitRect(x, y, kx, startY, kw, kh)) {
          if (keys[i] === '←') {
            return { action: 'join_backspace' };
          }
          return { action: 'join_digit', digit: keys[i] };
        }
      }
    }
  }

  if (scene === 'waiting') {
    if (state.isHost && hitRect(x, y, w / 2 - 90, h * 0.78, 180, 44)) {
      return { action: 'start_game' };
    }
  }

  if (scene === 'selecting') {
    const cardW = w / 6 - 12;
    const startX = 8;
    const startY = h * 0.13;
    const cardH = h * 0.58;
    for (let i = 0; i < CHAR_LIST.length; i++) {
      const id = CHAR_LIST[i];
      const cx = startX + i * (cardW + 8);
      if (hitRect(x, y, cx, startY, cardW, cardH)) {
        if (state.takenChars && state.takenChars.includes(id) && state.selectedChar !== id) {
          return { action: 'none' };
        }
        return { action: 'select_char', charId: id };
      }
    }
    if (hitRect(x, y, w / 2 - 80, h * 0.82, 160, 44) && !state.ready) {
      return { action: 'ready' };
    }
  }

  if (scene === 'gameover') {
    if (hitRect(x, y, w / 2 - 90, h * 0.82, 180, 44)) {
      return { action: 'back_lobby' };
    }
  }

  return { action: 'none' };
}

module.exports = { drawLobby, drawWaiting, drawCharSelect, drawHUD, drawGameOver, handleTouch };
