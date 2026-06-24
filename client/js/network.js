const isWeChat = typeof wx !== 'undefined' && wx.connectSocket;

let socket = null;
let messageHandler = null;
let openHandler = null;
let closeHandler = null;

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