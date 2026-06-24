const CHARACTERS = require('./characters');
const GameLoop = require('./game-loop');

const MAX_PLAYERS = 6;
const rooms = new Map();

function generateCode() {
  let code;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(code));
  return code;
}

function broadcast(room, message) {
  const data = JSON.stringify(message);
  for (const ws of room.players.keys()) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

function roomSnapshot(room) {
  const players = [];
  for (const [ws, p] of room.players) {
    players.push({ id: p.id, charId: p.charId, ready: p.ready, isHost: ws === room.host });
  }
  return { type: 'room_update', code: room.code, state: room.state, players };
}

function createRoom(ws, playerId) {
  leaveRoom(ws);
  const code = generateCode();
  const room = { code, players: new Map(), state: 'waiting', host: ws, gameLoop: null };
  room.players.set(ws, { id: playerId, charId: null, ready: false });
  rooms.set(code, room);
  ws.roomCode = code;
  return code;
}

function joinRoom(ws, code, playerId) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.state !== 'waiting' && room.state !== 'selecting') return { error: 'Game already in progress' };
  if (room.players.size >= MAX_PLAYERS) return { error: 'Room is full' };
  leaveRoom(ws);
  room.players.set(ws, { id: playerId, charId: null, ready: false });
  ws.roomCode = code;
  broadcast(room, roomSnapshot(room));
  return { code };
}

function leaveRoom(ws) {
  const code = ws.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) { delete ws.roomCode; return; }
  room.players.delete(ws);
  delete ws.roomCode;
  if (room.gameLoop) room.gameLoop.removePlayer(ws);
  if (room.players.size === 0) {
    if (room.gameLoop) room.gameLoop.stop();
    rooms.delete(code);
    return;
  }
  if (room.host === ws) room.host = room.players.keys().next().value;
  if (room.state === 'selecting') {
    for (const p of room.players.values()) p.ready = false;
  }
  if (room.state === 'playing' && room.gameLoop) room.gameLoop.checkWinCondition();
  broadcast(room, roomSnapshot(room));
}

function getRoom(code) { return rooms.get(code); }
function getRoomByWs(ws) { return ws.roomCode ? rooms.get(ws.roomCode) : null; }

function startCharacterSelection(ws) {
  const room = getRoomByWs(ws);
  if (!room) return { error: 'Not in a room' };
  if (room.host !== ws) return { error: 'Only host can start' };
  if (room.state !== 'waiting') return { error: 'Already started' };
  if (room.players.size < 2) return { error: 'Need at least 2 players' };
  room.state = 'selecting';
  for (const p of room.players.values()) { p.charId = null; p.ready = false; }
  broadcast(room, roomSnapshot(room));
  return {};
}

function selectCharacter(ws, charId) {
  const room = getRoomByWs(ws);
  if (!room) return { error: 'Not in a room' };
  if (room.state !== 'selecting') return { error: 'Not in selection phase' };
  if (!CHARACTERS[charId]) return { error: 'Invalid character' };
  for (const [otherWs, p] of room.players) {
    if (otherWs !== ws && p.charId === charId) return { error: 'Character already taken' };
  }
  const player = room.players.get(ws);
  player.charId = charId;
  player.ready = false;
  broadcast(room, roomSnapshot(room));
  return {};
}

function setReady(ws) {
  const room = getRoomByWs(ws);
  if (!room) return { error: 'Not in a room' };
  if (room.state !== 'selecting') return { error: 'Not in selection phase' };
  const player = room.players.get(ws);
  if (!player.charId) return { error: 'Select a character first' };
  player.ready = true;
  broadcast(room, roomSnapshot(room));
  if ([...room.players.values()].every((p) => p.ready && p.charId)) startGame(room);
  return {};
}

function startGame(room) {
  room.state = 'playing';
  const playerList = [];
  for (const [ws, p] of room.players) playerList.push({ ws, id: p.id, charId: p.charId });
  room.gameLoop = new GameLoop(room, playerList, (msg) => broadcast(room, msg));
  room.gameLoop.start();
  broadcast(room, { type: 'game_start', code: room.code });
}

function handleInput(ws, input) {
  const room = getRoomByWs(ws);
  if (room?.gameLoop) room.gameLoop.queueInput(ws, input);
}

function endGame(room) {
  room.state = 'ended';
  if (room.gameLoop) { room.gameLoop.stop(); room.gameLoop = null; }
  broadcast(room, roomSnapshot(room));
}

module.exports = {
  createRoom, joinRoom, leaveRoom, getRoom, getRoomByWs,
  startCharacterSelection, selectCharacter, setReady, handleInput, endGame, broadcast, roomSnapshot,
};
