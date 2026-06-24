const network = require('./network');
const renderer = require('./renderer');
const input = require('./input');
const ui = require('./ui');
const assets = require('./assets');
const { CHARACTERS } = require('./characters');

const SERVER_URL = 'ws://localhost:3000';
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
      connected = true;
      connecting = false;
      errorMsg = '';
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
      gameState = null;
      prevState = null;
      killFeed = [];
      break;

    case 'state':
      prevState = gameState;
      gameState = { ...msg, killFeed };
      stateReceivedAt = Date.now();
      break;

    case 'game_over':
      gameResults = {
        winner: msg.winner,
        scores: msg.scores,
        won: msg.winner && msg.winner.id === myId,
      };
      scene = 'gameover';
      break;

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
      network.send({ type: 'join_room', code: action.code });
      joinMode = false;
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
    camera = renderer.render(renderState, myId, camera, screenW, screenH) || camera;
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