const CHARACTERS = require('./characters');
const GameLoop = require('./game-loop');

const MAX_PLAYERS = 6;
const rooms = new Map();

function getTeamConfig(playerCount) {
  if (playerCount <= 3) return { numTeams: 0 };
  if (playerCount === 4) return { numTeams: 2 };
  return { numTeams: 3 };
}

function updateTeamAssignments(room) {
  const { numTeams } = getTeamConfig(room.players.size);
  let readyIdx = 0;
  for (const p of room.players.values()) {
    if (!p.ready) {
      p.team = -1;
      continue;
    }
    p.team = numTeams === 0 ? -1 : readyIdx % numTeams;
    readyIdx++;
  }
}

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
    players.push({
      id: p.id, nickname: p.nickname || p.id, charId: p.charId, ready: p.ready, isHost: ws === room.host,
      team: p.team !== undefined ? p.team : -1,
    });
  }
  return { type: 'room_update', code: room.code, state: room.state, difficulty: room.mapDifficulty, players };
}

function createRoom(ws, nickname) {
  leaveRoom(ws);
  const code = generateCode();
  const room = { code, players: new Map(), state: 'waiting', host: ws, gameLoop: null, mapDifficulty: 'easy' };
  room.players.set(ws, { id: ws.playerId, nickname: nickname || ws.playerId, charId: null, ready: false, team: -1 });
  rooms.set(code, room);
  ws.roomCode = code;
  return code;
}

function joinRoom(ws, code, nickname) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.state !== 'waiting' && room.state !== 'selecting') return { error: 'Game already in progress' };
  if (room.players.size >= MAX_PLAYERS) return { error: 'Room is full' };
  leaveRoom(ws);
  room.players.set(ws, { id: ws.playerId, nickname: nickname || ws.playerId, charId: null, ready: false, team: -1 });
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
  if (room.players.size < 1) return { error: 'Need at least 1 player' };
  room.state = 'selecting';
  for (const p of room.players.values()) { p.charId = null; p.ready = false; p.team = -1; }
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
  player.team = -1;
  updateTeamAssignments(room);
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
  updateTeamAssignments(room);
  broadcast(room, roomSnapshot(room));
  if ([...room.players.values()].every((p) => p.ready && p.charId)) startGame(room);
  return {};
}

function setDifficulty(ws, difficulty) {
  const room = getRoomByWs(ws);
  if (!room) return { error: 'Not in a room' };
  if (room.host !== ws) return { error: 'Only host can change difficulty' };
  if (room.state !== 'waiting') return { error: 'Game already started' };
  if (!['easy', 'hard', 'hell'].includes(difficulty)) return { error: 'Invalid difficulty' };
  room.mapDifficulty = difficulty;
  broadcast(room, roomSnapshot(room));
  return {};
}

function startGame(room) {
  room.state = 'playing';
  const playerList = [];
  for (const [ws, p] of room.players) {
    playerList.push({
      ws, id: p.id, nickname: p.nickname || p.id, charId: p.charId,
      team: p.team !== undefined ? p.team : -1,
    });
  }
  const difficulty = room.mapDifficulty || 'easy';
  room.gameLoop = new GameLoop(room, playerList, difficulty, (msg) => broadcast(room, msg));
  broadcast(room, { type: 'game_start', code: room.code, map: room.gameLoop.map, difficulty });
  room.gameLoop.start();
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
  startCharacterSelection, selectCharacter, setReady, setDifficulty, handleInput, endGame, broadcast, roomSnapshot,
};
