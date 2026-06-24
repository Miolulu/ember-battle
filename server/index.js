const http = require('http');
const { WebSocketServer } = require('ws');
const room = require('./room');

const PORT = process.env.PORT || 3000;
let nextPlayerId = 1;

function send(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Ember Battle Server OK');
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.playerId = `p${nextPlayerId++}`;
  ws.nickname = ws.playerId;
  send(ws, { type: 'connected', id: ws.playerId, nickname: ws.nickname });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'set_nickname': {
        ws.nickname = (msg.nickname || '').slice(0, 8) || ws.playerId;
        send(ws, { type: 'nickname_set', nickname: ws.nickname });
        break;
      }

      case 'create_room': {
        const code = room.createRoom(ws, ws.nickname || ws.playerId);
        send(ws, { type: 'room_created', code });
        send(ws, room.roomSnapshot(room.getRoom(code)));
        break;
      }

      case 'join_room': {
        const result = room.joinRoom(ws, msg.code, ws.nickname || ws.playerId);
        if (result.error) {
          send(ws, { type: 'error', message: result.error });
        } else {
          send(ws, { type: 'room_joined', code: result.code });
        }
        break;
      }

      case 'select_char': {
        const result = room.selectCharacter(ws, msg.charId);
        if (result.error) send(ws, { type: 'error', message: result.error });
        break;
      }

      case 'ready': {
        const result = room.setReady(ws);
        if (result.error) send(ws, { type: 'error', message: result.error });
        break;
      }

      case 'start_game': {
        const result = room.startCharacterSelection(ws);
        if (result.error) send(ws, { type: 'error', message: result.error });
        break;
      }

      case 'set_difficulty': {
        const result = room.setDifficulty(ws, msg.difficulty);
        if (result.error) send(ws, { type: 'error', message: result.error });
        break;
      }

      case 'input': {
        room.handleInput(ws, {
          dir: msg.dir || [0, 0],
          shoot: !!msg.shoot,
          skill: !!msg.skill,
        });
        break;
      }

      default:
        send(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
    }
  });

  ws.on('close', () => {
    room.leaveRoom(ws);
  });
});

server.listen(PORT, () => {
  console.log(`Ember Battle server listening on port ${PORT}`);
});
