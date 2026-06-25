(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const isWeChat = typeof wx !== 'undefined' && wx.createImage;

const manifest = {
  char_yan: 'images/char_yan.png',
  char_shenmu: 'images/char_shenmu.png',
  char_sutang: 'images/char_sutang.png',
  char_luyu: 'images/char_luyu.png',
  char_jiangxue: 'images/char_jiangxue.png',
  char_peijin: 'images/char_peijin.png',
  skill_yan: 'images/skill_yan.png',
  skill_shenmu: 'images/skill_shenmu.png',
  skill_sutang: 'images/skill_sutang.png',
  skill_luyu: 'images/skill_luyu.png',
  skill_jiangxue: 'images/skill_jiangxue.png',
  skill_peijin: 'images/skill_peijin.png',
  tile_floor: 'images/tile_floor.png',
  tile_wall: 'images/tile_wall.png',
  tile_breakable: 'images/tile_breakable.png',
  logo: 'images/logo.png',
  btn_shoot: 'images/btn_shoot.png',
  btn_create: 'images/btn_create.png',
  btn_join: 'images/btn_join.png',
  btn_ready: 'images/btn_ready.png',
  btn_start: 'images/btn_start.png',
  fx_fire: 'images/fx_fire.png',
  fx_heal: 'images/fx_heal.png',
  fx_disrupt: 'images/fx_disrupt.png',
  fx_bullet: 'images/fx_bullet.png',
  fx_ice: 'images/fx_ice.png',
};

const images = {};
let loaded = 0;
let total = Object.keys(manifest).length;

function createImage() {
  return isWeChat ? wx.createImage() : new Image();
}

function loadAll(onProgress, onComplete) {
  const keys = Object.keys(manifest);
  total = keys.length;
  loaded = 0;

  keys.forEach((key) => {
    const img = createImage();
    img.onload = () => {
      loaded++;
      if (onProgress) onProgress(loaded, total);
      if (loaded >= total && onComplete) onComplete();
    };
    img.onerror = () => {
      console.warn('Failed to load:', key, manifest[key]);
      loaded++;
      if (loaded >= total && onComplete) onComplete();
    };
    img.src = manifest[key];
    images[key] = img;
  });
}

function get(key) {
  return images[key] || null;
}

function isReady() {
  return loaded >= total;
}

function getProgress() {
  return total > 0 ? loaded / total : 1;
}

module.exports = { loadAll, get, isReady, getProgress };

},{}],2:[function(require,module,exports){
const CHARACTERS = {
  yan: { id: 'yan', name: '焰', role: '突击', teamRole: '输出', speed: 3.5, maxHp: 100, damage: 25, skillName: '焚烧', skillCooldown: 8000, color: '#ff4d35' },
  shenmu: { id: 'shenmu', name: '沈暮', role: '干扰', teamRole: '控制', speed: 4.5, maxHp: 70, damage: 18, skillName: '入侵', skillCooldown: 8000, color: '#4da6ff' },
  sutang: { id: 'sutang', name: '苏棠', role: '辅助', teamRole: '治疗', speed: 3.5, maxHp: 100, damage: 12, skillName: '愈合', skillCooldown: 8000, color: '#4dff88' },
  luyu: { id: 'luyu', name: '陆屿', role: '防御', teamRole: '坦克', speed: 2.8, maxHp: 140, damage: 18, skillName: '铁壁', skillCooldown: 8000, color: '#b0b8c4' },
  jiangxue: { id: 'jiangxue', name: '姜雪', role: '狙击', teamRole: '输出', speed: 3.5, maxHp: 70, damage: 30, skillName: '相位射击', skillCooldown: 8000, color: '#c8d8ff' },
  peijin: { id: 'peijin', name: '裴今', role: '概率', teamRole: '辅助', speed: 4.5, maxHp: 70, damage: 10, skillName: '干涉', skillCooldown: 8000, color: '#ffd700' },
};
const CHAR_LIST = ['yan', 'shenmu', 'sutang', 'luyu', 'jiangxue', 'peijin'];

const TEAM_COLORS = ['#ff4d35', '#4da6ff', '#ffd700'];
const TEAM_NAMES = ['红队', '蓝队', '金队'];

module.exports = { CHARACTERS, CHAR_LIST, TEAM_COLORS, TEAM_NAMES };

},{}],3:[function(require,module,exports){
const isWeChat = typeof wx !== 'undefined' && wx.onTouchStart;
const assets = require('./assets');

const JOY_BASE_R = 50;
const JOY_KNOB_R = 22;
const JOY_MAX = 40;
const BTN_R = 36;

let canvas = null;
let screenW = 0;
let screenH = 0;

let joyActive = false;
let joyBaseX = 0;
let joyBaseY = 0;
let joyKnobX = 0;
let joyKnobY = 0;
let joyDir = [0, 0];

let shootDown = false;
let skillDown = false;
let shootPressed = false;
let skillPressed = false;

let keys = {};
let mouseDown = false;
let gameActive = false;

function getTouchPos(touch) {
  return { x: touch.clientX ?? touch.x, y: touch.clientY ?? touch.y };
}

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function updateJoystick(x, y) {
  const dx = x - joyBaseX;
  const dy = y - joyBaseY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) {
    joyKnobX = joyBaseX;
    joyKnobY = joyBaseY;
    joyDir = [0, 0];
    return;
  }
  const clamped = Math.min(dist, JOY_MAX);
  joyKnobX = joyBaseX + (dx / dist) * clamped;
  joyKnobY = joyBaseY + (dy / dist) * clamped;
  joyDir = [dx / dist, dy / dist];
}

function resetJoystick() {
  joyActive = false;
  joyKnobX = joyBaseX;
  joyKnobY = joyBaseY;
  joyDir = [0, 0];
}

function getButtonCenters(w, h) {
  const shootX = w * 0.82;
  const shootY = h * 0.62;
  const skillX = w * 0.92;
  const skillY = h * 0.42;
  return { shootX, shootY, skillX, skillY };
}

function handleTouchStart(x, y) {
  shootPressed = false;
  skillPressed = false;

  if (x < screenW * 0.4) {
    joyActive = true;
    joyBaseX = x;
    joyBaseY = y;
    joyKnobX = x;
    joyKnobY = y;
    updateJoystick(x, y);
    return;
  }

  const { shootX, shootY, skillX, skillY } = getButtonCenters(screenW, screenH);
  if (inCircle(x, y, shootX, shootY, BTN_R + 10)) {
    shootDown = true;
    shootPressed = true;
  } else if (inCircle(x, y, skillX, skillY, BTN_R + 10)) {
    skillDown = true;
    skillPressed = true;
  }
}

function handleTouchMove(x, y) {
  if (joyActive) updateJoystick(x, y);
}

function handleTouchEnd() {
  resetJoystick();
  shootDown = false;
  skillDown = false;
}

function bindCanvasEvents() {
  if (!canvas) return;

  if (isWeChat) {
    wx.onTouchStart((e) => {
      const t = e.touches[0];
      if (t) handleTouchStart(t.clientX, t.clientY);
    });
    wx.onTouchMove((e) => {
      const t = e.touches[0];
      if (t) handleTouchMove(t.clientX, t.clientY);
    });
    wx.onTouchEnd(() => handleTouchEnd());
    wx.onTouchCancel(() => handleTouchEnd());
  } else {
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      handleTouchStart(t.clientX, t.clientY);
    });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      handleTouchMove(t.clientX, t.clientY);
    });
    canvas.addEventListener('touchend', () => handleTouchEnd());
    canvas.addEventListener('touchcancel', () => handleTouchEnd());

    canvas.addEventListener('mousedown', (e) => {
      mouseDown = true;
      const rect = canvas.getBoundingClientRect();
      handleTouchStart(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!joyActive) return;
      const rect = canvas.getBoundingClientRect();
      handleTouchMove(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('mouseup', () => { mouseDown = false; handleTouchEnd(); });
    canvas.addEventListener('mouseleave', () => { mouseDown = false; handleTouchEnd(); });

    document.addEventListener('keydown', (e) => {
      if (!gameActive) return;
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key.toLowerCase() === 'j') shootPressed = true;
      if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'k') skillPressed = true;
    });
    document.addEventListener('keyup', (e) => {
      if (!gameActive) return;
      keys[e.key.toLowerCase()] = false;
    });
  }
}

function init(c) {
  canvas = c;
  bindCanvasEvents();
}

function update() {
  // edge-triggered shoot/skill consumed in getInput
}

function getInput() {
  let dx = joyDir[0];
  let dy = joyDir[1];

  if (keys['w'] || keys['arrowup']) dy = -1;
  if (keys['s'] || keys['arrowdown']) dy = 1;
  if (keys['a'] || keys['arrowleft']) dx = -1;
  if (keys['d'] || keys['arrowright']) dx = 1;

  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 1) { dx /= len; dy /= len; }

  const result = {
    dir: [dx, dy],
    shoot: shootPressed || shootDown || mouseDown || keys[' '] || keys['j'],
    skill: skillPressed || skillDown || keys['e'] || keys['k'],
  };
  shootPressed = false;
  skillPressed = false;
  return result;
}

function drawControls(ctx, w, h, skillName, skillCooldownPct) {
  screenW = w;
  screenH = h;

  const defaultJoyX = w * 0.15;
  const defaultJoyY = h * 0.65;
  const baseX = joyActive ? joyBaseX : defaultJoyX;
  const baseY = joyActive ? joyBaseY : defaultJoyY;
  const knobX = joyActive ? joyKnobX : defaultJoyX;
  const knobY = joyActive ? joyKnobY : defaultJoyY;

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(baseX, baseY, JOY_BASE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#cccccc';
  ctx.beginPath();
  ctx.arc(knobX, knobY, JOY_KNOB_R, 0, Math.PI * 2);
  ctx.fill();

  const { shootX, shootY, skillX, skillY } = getButtonCenters(w, h);

  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#ff4d35';
  ctx.beginPath();
  ctx.arc(shootX, shootY, BTN_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cc3322';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('射击', shootX, shootY);

  ctx.fillStyle = '#2a2a3a';
  ctx.beginPath();
  ctx.arc(skillX, skillY, BTN_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff4d35';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (skillCooldownPct > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.moveTo(skillX, skillY);
    ctx.arc(skillX, skillY, BTN_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * skillCooldownPct);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  const label = skillName || '技能';
  ctx.fillText(label.length > 4 ? label.slice(0, 4) : label, skillX, skillY);

  ctx.restore();
}

function setGameActive(active) {
  gameActive = active;
  if (!active) {
    keys = {};
    shootPressed = false;
    skillPressed = false;
    shootDown = false;
    skillDown = false;
  }
}

module.exports = { init, update, getInput, drawControls, setGameActive };
},{"./assets":1}],4:[function(require,module,exports){
(function (global){(function (){
const network = require('./network');
const renderer = require('./renderer');
const input = require('./input');
const ui = require('./ui');
const assets = require('./assets');
const { CHARACTERS } = require('./characters');

const PROD_WS = 'wss://treewhisper-production.up.railway.app';
const SERVER_URL = (typeof location !== 'undefined' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1')
  ? PROD_WS
  : 'ws://localhost:3000';
const INPUT_INTERVAL = 50;
const TICK_MS = 50;

const isWeChat = typeof wx !== 'undefined' && wx.createCanvas;

let canvas = null;
let ctx = null;
let screenW = 0;
let screenH = 0;

let scene = 'lobby';
let myId = null;
let connected = false;
let connecting = false;
let roomCode = null;
let roomPlayers = [];
let roomState = 'waiting';
let isHost = false;
let selectedChar = null;
let ready = false;
let joinMode = false;
let joinCode = '';
let errorMsg = '';

let nickname = '';
let nicknameInput = '';

let mapDifficulty = 'easy';
let gameMap = null;

let gameState = null;
let prevState = null;
let stateReceivedAt = 0;
let gameResults = null;
let killFeed = [];

let lastInputSent = 0;
let camera = { x: 0, y: 0 };
let skillCooldownPct = 0;
let localSkillCooldown = 0;

function createCanvas() {
  if (isWeChat) {
    const info = wx.getSystemInfoSync();
    const c = wx.createCanvas();
    c.width = info.windowWidth;
    c.height = info.windowHeight;
    return c;
  }
  const c = document.createElement('canvas');
  document.body.style.margin = '0';
  document.body.style.background = '#0d0d14';
  document.body.style.overflow = 'hidden';
  document.body.appendChild(c);
  const resize = () => {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    screenW = c.width;
    screenH = c.height;
  };
  window.addEventListener('resize', resize);
  resize();
  return c;
}

function getUiState() {
  const takenChars = roomPlayers.filter((p) => p.id !== myId && p.charId).map((p) => p.charId);
  return {
    screenW,
    screenH,
    joinMode,
    joinCode,
    connecting,
    error: errorMsg,
    roomCode,
    players: roomPlayers,
    isHost,
    selectedChar,
    ready,
    takenChars,
    nickname,
    nicknameInput,
    mapDifficulty,
  };
}

function interpolateState(from, to, t) {
  if (!to) return null;
  if (!from || !from.players) return to;

  const result = {
    ...to,
    players: to.players.map((tp) => {
      const fp = from.players.find((p) => p.id === tp.id);
      if (!fp) return { ...tp };
      return {
        ...tp,
        x: fp.x + (tp.x - fp.x) * t,
        y: fp.y + (tp.y - fp.y) * t,
        dir: tp.dir,
      };
    }),
  };
  return result;
}

function getRenderState() {
  if (!gameState) return null;
  const elapsed = Date.now() - stateReceivedAt;
  const t = Math.min(1, elapsed / TICK_MS);
  return interpolateState(prevState, gameState, t);
}

function updateSceneFromRoom() {
  if (roomState === 'waiting') scene = 'waiting';
  else if (roomState === 'selecting') scene = 'selecting';
  else if (roomState === 'playing') scene = 'playing';
  else if (roomState === 'ended') scene = 'gameover';
}

function handleNetworkMessage(msg) {
  switch (msg.type) {
    case 'connected':
      myId = msg.id;
      nickname = msg.nickname || msg.id;
      nicknameInput = nickname;
      connected = true;
      connecting = false;
      errorMsg = '';
      break;

    case 'nickname_set':
      nickname = msg.nickname;
      break;

    case 'room_created':
      roomCode = msg.code;
      scene = 'waiting';
      isHost = true;
      errorMsg = '';
      break;

    case 'room_joined':
      roomCode = msg.code;
      scene = 'waiting';
      errorMsg = '';
      break;

    case 'room_update':
      roomCode = msg.code;
      roomState = msg.state;
      roomPlayers = msg.players || [];
      if (msg.difficulty) mapDifficulty = msg.difficulty;
      isHost = roomPlayers.some((p) => p.id === myId && p.isHost);
      const me = roomPlayers.find((p) => p.id === myId);
      if (me) {
        selectedChar = me.charId;
        ready = me.ready;
      }
      updateSceneFromRoom();
      break;

    case 'game_start':
      scene = 'playing';
      roomState = 'playing';
      if (msg.map) gameMap = msg.map;
      if (msg.difficulty) mapDifficulty = msg.difficulty;
      gameState = null;
      prevState = null;
      killFeed = [];
      break;

    case 'state':
      prevState = gameState;
      gameState = { ...msg, killFeed };
      stateReceivedAt = Date.now();
      break;

    case 'game_over': {
      const myScore = msg.scores && msg.scores.find((s) => s.id === myId);
      gameResults = {
        winner: msg.winner,
        scores: msg.scores,
        winningTeam: msg.winningTeam,
        myTeam: myScore ? myScore.team : -1,
        won: msg.winningTeam >= 0
          ? myScore && myScore.team === msg.winningTeam
          : msg.winner && msg.winner.id === myId,
      };
      scene = 'gameover';
      break;
    }

    case 'error':
      errorMsg = msg.message || '未知错误';
      connecting = false;
      break;
  }
}

function connectServer() {
  if (connected || connecting) return;
  connecting = true;
  network.connect(SERVER_URL);
}

function handleUiAction(action) {
  switch (action.action) {
    case 'create_room':
      connectServer();
      network.send({ type: 'set_nickname', nickname: nickname || nicknameInput || ('玩家' + Math.floor(Math.random() * 100)) });
      network.send({ type: 'create_room' });
      break;
    case 'toggle_join':
      joinMode = !joinMode;
      joinCode = '';
      break;
    case 'join_digit':
      if (joinCode.length < 4) joinCode += action.digit;
      break;
    case 'join_backspace':
      joinCode = joinCode.slice(0, -1);
      break;
    case 'join_room':
      connectServer();
      network.send({ type: 'set_nickname', nickname: nickname || nicknameInput || ('玩家' + Math.floor(Math.random() * 100)) });
      network.send({ type: 'join_room', code: action.code });
      joinMode = false;
      break;
    case 'set_difficulty':
      network.send({ type: 'set_difficulty', difficulty: action.difficulty });
      break;
    case 'start_game':
      network.send({ type: 'start_game' });
      break;
    case 'select_char':
      selectedChar = action.charId;
      network.send({ type: 'select_char', charId: action.charId });
      break;
    case 'ready':
      network.send({ type: 'ready' });
      ready = true;
      break;
    case 'back_lobby':
      scene = 'lobby';
      roomCode = null;
      roomPlayers = [];
      roomState = 'waiting';
      gameState = null;
      gameResults = null;
      gameMap = null;
      mapDifficulty = 'easy';
      selectedChar = null;
      ready = false;
      joinMode = false;
      joinCode = '';
      errorMsg = '';
      break;
  }
}

function bindUiTouch() {
  const handler = (x, y) => {
    if (scene === 'playing') return;
    const action = ui.handleTouch(x, y, scene, getUiState());
    if (action.action !== 'none') handleUiAction(action);
  };

  if (isWeChat) {
    wx.onTouchStart((e) => {
      if (scene === 'playing') return;
      const t = e.touches[0];
      if (t) handler(t.clientX, t.clientY);
    });
  } else {
    canvas.addEventListener('click', (e) => {
      if (scene === 'playing') return;
      const rect = canvas.getBoundingClientRect();
      handler(e.clientX - rect.left, e.clientY - rect.top);
    });
  }
}

function bindKeyboardInput() {
  document.addEventListener('keydown', (e) => {
    if (scene === 'playing') return;

    if (scene === 'lobby') {
      if (joinMode) {
        if (e.key >= '0' && e.key <= '9' && joinCode.length < 4) {
          joinCode += e.key;
        } else if (e.key === 'Backspace') {
          joinCode = joinCode.slice(0, -1);
        } else if (e.key === 'Enter' && joinCode.length === 4) {
          handleUiAction({ action: 'join_room', code: joinCode });
        } else if (e.key === 'Escape') {
          joinMode = false;
          joinCode = '';
        }
      } else {
        if (e.key === 'Backspace') {
          nicknameInput = nicknameInput.slice(0, -1);
        } else if (e.key === 'Enter') {
          handleUiAction({ action: 'create_room' });
        } else if (e.key.length === 1 && nicknameInput.length < 8) {
          nicknameInput += e.key;
        }
      }
      e.preventDefault();
    }
  });
}

function updateSkillCooldown() {
  if (localSkillCooldown > 0) {
    localSkillCooldown = Math.max(0, localSkillCooldown - 16);
  }
  const me = gameState && gameState.players ? gameState.players.find((p) => p.id === myId) : null;
  const charDef = me && me.charId ? CHARACTERS[me.charId] : null;
  if (charDef) {
    skillCooldownPct = localSkillCooldown / charDef.skillCooldown;
  } else {
    skillCooldownPct = 0;
  }
}

function gameLoop() {
  requestAnimationFrame(gameLoop);

  screenW = canvas.width;
  screenH = canvas.height;

  input.setGameActive(scene === 'playing');

  if (scene === 'lobby') {
    ui.drawLobby(ctx, screenW, screenH, getUiState());
  } else if (scene === 'waiting') {
    ui.drawWaiting(ctx, screenW, screenH, getUiState());
  } else if (scene === 'selecting') {
    ui.drawCharSelect(ctx, screenW, screenH, getUiState());
  } else if (scene === 'playing') {
    input.update();
    const now = Date.now();
    const inp = input.getInput();

    if (now - lastInputSent >= INPUT_INTERVAL) {
      network.send({ type: 'input', dir: inp.dir, shoot: inp.shoot, skill: inp.skill });
      if (inp.skill) {
        const me = gameState && gameState.players ? gameState.players.find((p) => p.id === myId) : null;
        const charDef = me && me.charId ? CHARACTERS[me.charId] : null;
        if (charDef) localSkillCooldown = charDef.skillCooldown;
      }
      lastInputSent = now;
    }

    const renderState = getRenderState();
    camera = renderer.render(renderState, myId, camera, screenW, screenH, gameMap) || camera;
    ui.drawHUD(ctx, screenW, screenH, renderState || gameState, myId);

    const me = renderState && renderState.players ? renderState.players.find((p) => p.id === myId) : null;
    const skillName = me && me.charId ? CHARACTERS[me.charId].skillName : '技能';
    updateSkillCooldown();
    input.drawControls(ctx, screenW, screenH, skillName, skillCooldownPct);
  } else if (scene === 'gameover') {
    ui.drawGameOver(ctx, screenW, screenH, gameResults);
  }
}

function drawLoadingScreen(progress) {
  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(0, 0, screenW, screenH);
  ctx.fillStyle = '#ff4d35';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('余烬·战场', screenW / 2, screenH / 2 - 30);
  ctx.fillStyle = '#888899';
  ctx.font = '14px sans-serif';
  ctx.fillText('加载资源中...', screenW / 2, screenH / 2 + 10);
  const barW = 200;
  const barH = 8;
  ctx.fillStyle = '#333344';
  ctx.fillRect(screenW / 2 - barW / 2, screenH / 2 + 30, barW, barH);
  ctx.fillStyle = '#ff4d35';
  ctx.fillRect(screenW / 2 - barW / 2, screenH / 2 + 30, barW * progress, barH);
}

let assetsLoaded = false;

function start() {
  canvas = createCanvas();
  ctx = canvas.getContext('2d');
  screenW = canvas.width;
  screenH = canvas.height;

  renderer.init(canvas);
  input.init(canvas);
  bindUiTouch();
  bindKeyboardInput();

  network.onOpen(() => {
    connected = true;
    connecting = false;
  });
  network.onClose(() => {
    connected = false;
    connecting = false;
  });
  network.onMessage(handleNetworkMessage);

  assets.loadAll(
    (loaded, total) => {
      drawLoadingScreen(loaded / total);
    },
    () => {
      assetsLoaded = true;
      connectServer();
      gameLoop();
    }
  );

  // Show initial loading screen immediately
  drawLoadingScreen(0);
}

if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
}

start();
module.exports = { start };
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./assets":1,"./characters":2,"./input":3,"./network":6,"./renderer":7,"./ui":8}],5:[function(require,module,exports){
const TILE_SIZE = 40;
const MAP_W = 30;
const MAP_H = 20;

const MAP = (() => {
  const map = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(0));
  for (let x = 0; x < MAP_W; x++) {
    map[0][x] = 1;
    map[MAP_H - 1][x] = 1;
  }
  for (let y = 0; y < MAP_H; y++) {
    map[y][0] = 1;
    map[y][MAP_W - 1] = 1;
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
})();

const SPAWN_POINTS = [
  { x: 120, y: 120 },
  { x: 1080, y: 120 },
  { x: 120, y: 680 },
  { x: 1080, y: 680 },
  { x: 600, y: 120 },
  { x: 600, y: 680 },
];

const WORLD_W = MAP_W * TILE_SIZE;
const WORLD_H = MAP_H * TILE_SIZE;

module.exports = { MAP, TILE_SIZE, MAP_W, MAP_H, WORLD_W, WORLD_H, SPAWN_POINTS };
},{}],6:[function(require,module,exports){
const isWeChat = typeof wx !== 'undefined' && wx.connectSocket;

let socket = null;
let messageHandler = null;
let openHandler = null;
let closeHandler = null;
let pendingQueue = [];

function connect(url) {
  disconnect();

  if (isWeChat) {
    socket = wx.connectSocket({ url });
    wx.onSocketOpen(() => {
      if (openHandler) openHandler();
    });
    wx.onSocketMessage((res) => {
      if (messageHandler) {
        try {
          messageHandler(JSON.parse(res.data));
        } catch {
          messageHandler(res.data);
        }
      }
    });
    wx.onSocketClose(() => {
      if (closeHandler) closeHandler();
      socket = null;
    });
    wx.onSocketError(() => {
      if (closeHandler) closeHandler();
      socket = null;
    });
  } else {
    socket = new WebSocket(url);
    socket.onopen = () => {
      if (openHandler) openHandler();
      while (pendingQueue.length > 0) {
        const msg = pendingQueue.shift();
        socket.send(msg);
      }
    };
    socket.onmessage = (ev) => {
      if (messageHandler) {
        try {
          messageHandler(JSON.parse(ev.data));
        } catch {
          messageHandler(ev.data);
        }
      }
    };
    socket.onclose = () => {
      if (closeHandler) closeHandler();
      socket = null;
    };
    socket.onerror = () => {
      if (closeHandler) closeHandler();
    };
  }
}

function send(data) {
  const payload = JSON.stringify(data);
  if (!socket) return;
  if (isWeChat) {
    wx.sendSocketMessage({ data: payload });
  } else if (socket.readyState === WebSocket.OPEN) {
    socket.send(payload);
  } else if (socket.readyState === WebSocket.CONNECTING) {
    pendingQueue.push(payload);
  }
}

function onMessage(callback) {
  messageHandler = callback;
}

function onOpen(callback) {
  openHandler = callback;
}

function onClose(callback) {
  closeHandler = callback;
}

function disconnect() {
  if (!socket) return;
  if (isWeChat) {
    wx.closeSocket();
  } else {
    socket.close();
  }
  socket = null;
}

module.exports = { connect, send, onMessage, onOpen, onClose, disconnect };
},{}],7:[function(require,module,exports){
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

},{"./assets":1,"./characters":2,"./map":5}],8:[function(require,module,exports){
const { CHARACTERS, CHAR_LIST, TEAM_COLORS, TEAM_NAMES } = require('./characters');
const assets = require('./assets');

const DIFFICULTY_LABELS = { easy: '简单', hard: '困难', hell: '地狱' };
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

function drawTeamBadge(ctx, x, y, team, small) {
  if (team === undefined || team < 0) return;
  const color = TEAM_COLORS[team] || '#888899';
  const label = TEAM_NAMES[team] || '?';
  const bw = small ? 36 : 44;
  const bh = small ? 16 : 20;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x - bw / 2, y, bw, bh);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = (small ? '9' : '10') + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + bh / 2);
}

function fillBg(ctx, w, h) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
}

function drawImgButton(ctx, x, y, bw, bh, imgKey, label, primary) {
  const img = assets.get(imgKey);
  if (img && img.complete && img.naturalWidth) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.min(bw / iw, bh / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, x + (bw - dw) / 2, y + (bh - dh) / 2, dw, dh);
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

  ctx.fillStyle = MUTED;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('昵称 (键盘直接输入):', w / 2, h * 0.37);

  const inputW = 180;
  const inputH = 36;
  const inputX = w / 2 - inputW / 2;
  const inputY = h * 0.39;
  ctx.fillStyle = PANEL;
  ctx.fillRect(inputX, inputY, inputW, inputH);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.strokeRect(inputX, inputY, inputW, inputH);
  const displayNick = state.nicknameInput || '';
  const blink = Math.floor(Date.now() / 500) % 2 === 0 ? '|' : '';
  ctx.fillStyle = displayNick ? TEXT : MUTED;
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(displayNick ? displayNick + blink : '输入昵称...' , w / 2, inputY + 24);

  const btnW = 200;
  const btnH = 50;
  const cx = w / 2 - btnW / 2;

  drawButton(ctx, cx, h * 0.50, btnW, btnH, '创建房间', true);
  drawButton(ctx, cx, h * 0.62, btnW, btnH, '加入房间', false);

  if (state.joinMode) {
    ctx.fillStyle = MUTED;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('输入4位房间号 (键盘输入, Enter确认, Esc取消):', w / 2, h * 0.72);

    const codeW = 160;
    const codeH = 44;
    ctx.fillStyle = PANEL;
    ctx.fillRect(w / 2 - codeW / 2, h * 0.74, codeW, codeH);
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - codeW / 2, h * 0.74, codeW, codeH);

    const code = state.joinCode || '';
    const display = code + '____'.slice(code.length);
    ctx.fillStyle = TEXT;
    ctx.font = '28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(display, w / 2, h * 0.74 + 30);

    if (code.length === 4) {
      drawButton(ctx, cx, h * 0.84, btnW, 44, '确认加入 (Enter)', true);
    }
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
  ctx.fillText('玩家 (' + (state.players ? state.players.length : 0) + '/6)', w / 2, h * 0.30);

  const diffLabel = DIFFICULTY_LABELS[state.mapDifficulty] || '简单';
  ctx.fillText('地图难度: ' + diffLabel, w / 2, h * 0.35);

  const listY = h * 0.40;
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
      const name = p.nickname || p.id;
      const hostTag = p.isHost ? ' [房主]' : '';
      ctx.fillText(name + hostTag, w / 2 - 100, y + 5);
    });
  }

  if (state.isHost) {
    const diffY = h * 0.68;
    const diffBtnW = 80;
    const diffGap = 10;
    const diffTotal = diffBtnW * 3 + diffGap * 2;
    const diffStartX = w / 2 - diffTotal / 2;
    ['easy', 'hard', 'hell'].forEach((d, i) => {
      const dx = diffStartX + i * (diffBtnW + diffGap);
      const selected = state.mapDifficulty === d;
      drawButton(ctx, dx, diffY, diffBtnW, 36, DIFFICULTY_LABELS[d], selected);
    });
    drawButton(ctx, w / 2 - 90, h * 0.78, 180, 44, '开始游戏', true);
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
    ctx.fillText(c.teamRole || c.role, x + cardW / 2, y + cardH * 0.73);
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
    drawButton(ctx, w / 2 - 80, h * 0.82, 160, 44, readyLabel, true);
  } else {
    drawButton(ctx, w / 2 - 80, h * 0.82, 160, 44, readyLabel, false);
  }

  if (state.players && state.players.some((p) => p.team >= 0)) {
    ctx.fillStyle = MUTED;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('队伍分配', w / 2, h * 0.76);
    const badgeY = h * 0.79;
    let bx = w / 2 - (state.players.length * 50) / 2;
    state.players.forEach((p) => {
      const charDef = p.charId ? CHARACTERS[p.charId] : null;
      ctx.fillStyle = TEXT;
      ctx.font = '10px sans-serif';
      ctx.fillText(charDef ? charDef.name : p.id.slice(0, 6), bx + 25, badgeY - 6);
      if (p.team >= 0) drawTeamBadge(ctx, bx + 25, badgeY + 2, p.team, true);
      bx += 50;
    });
  }
}

function drawHUD(ctx, w, h, gameState, myId) {
  if (!gameState || !gameState.players) return;

  const panelW = 150;
  const panelX = w - panelW - 8;
  let panelY = 8;

  const hasTeams = gameState.players.some((p) => p.team >= 0);
  let grouped;

  if (hasTeams) {
    grouped = [];
    const teamOrder = [0, 1, 2];
    for (const t of teamOrder) {
      const members = gameState.players.filter((p) => p.team === t);
      if (members.length) grouped.push({ team: t, members });
    }
    const noTeam = gameState.players.filter((p) => p.team < 0);
    if (noTeam.length) grouped.push({ team: -1, members: noTeam });
  } else {
    grouped = [{ team: -1, members: gameState.players }];
  }

  let totalH = 8;
  for (const g of grouped) {
    totalH += g.team >= 0 ? 18 : 0;
    totalH += g.members.length * 30;
  }

  ctx.fillStyle = 'rgba(13,13,20,0.8)';
  ctx.fillRect(panelX, panelY, panelW, totalH);

  for (const g of grouped) {
    if (g.team >= 0) {
      ctx.fillStyle = TEAM_COLORS[g.team] || MUTED;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(TEAM_NAMES[g.team] || '队', panelX + 6, panelY + 12);
      panelY += 18;
    }

    for (const p of g.members) {
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
      const displayName = p.nickname || charDef.name;
      ctx.fillText(displayName, panelX + 30, panelY + 12);

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
    }
  }

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
  const winningTeam = results && results.winningTeam;
  const myTeam = results && results.myTeam;

  if (winningTeam !== undefined && winningTeam !== null && winningTeam >= 0) {
    const teamWon = myTeam === winningTeam;
    const teamColor = TEAM_COLORS[winningTeam] || ACCENT;
    const teamName = TEAM_NAMES[winningTeam] || '未知';
    ctx.fillStyle = teamWon ? teamColor : MUTED;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(teamName + ' 胜利!', w / 2, h * 0.15);
    if (teamWon) {
      ctx.fillStyle = '#4dff88';
      ctx.font = '16px sans-serif';
      ctx.fillText('你的队伍获胜!', w / 2, h * 0.22);
    }
  } else {
    ctx.fillStyle = won ? '#4dff88' : ACCENT;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(won ? '胜利!' : '战斗结束', w / 2, h * 0.15);
  }

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
      const displayName = s.nickname || charDef.name;
      ctx.fillText((i + 1) + '. ' + displayName, w / 2 - 110, y + 5);
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
    const btnW = 200;
    const btnH = 50;
    const cx = w / 2 - btnW / 2;

    if (hitRect(x, y, cx, h * 0.50, btnW, btnH)) {
      return { action: 'create_room' };
    }
    if (hitRect(x, y, cx, h * 0.62, btnW, btnH)) {
      return { action: 'toggle_join' };
    }
    if (state.joinMode) {
      if (hitRect(x, y, cx, h * 0.84, btnW, 44) && (state.joinCode || '').length === 4) {
        return { action: 'join_room', code: state.joinCode };
      }
    }
  }

  if (scene === 'waiting') {
    if (state.isHost) {
      const diffY = h * 0.68;
      const diffBtnW = 80;
      const diffGap = 10;
      const diffTotal = diffBtnW * 3 + diffGap * 2;
      const diffStartX = w / 2 - diffTotal / 2;
      const diffs = ['easy', 'hard', 'hell'];
      for (let i = 0; i < diffs.length; i++) {
        const dx = diffStartX + i * (diffBtnW + diffGap);
        if (hitRect(x, y, dx, diffY, diffBtnW, 36)) {
          return { action: 'set_difficulty', difficulty: diffs[i] };
        }
      }
      if (hitRect(x, y, w / 2 - 90, h * 0.78, 180, 44)) {
        return { action: 'start_game' };
      }
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

},{"./assets":1,"./characters":2}]},{},[4]);
