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
      const rect = canvas.getBoundingClientRect();
      handleTouchStart(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!joyActive) return;
      const rect = canvas.getBoundingClientRect();
      handleTouchMove(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('mouseup', () => handleTouchEnd());
    canvas.addEventListener('mouseleave', () => handleTouchEnd());
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
  const result = {
    dir: [...joyDir],
    shoot: shootPressed || shootDown,
    skill: skillPressed || skillDown,
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
  const shootImg = assets.get('btn_shoot');
  if (shootImg && shootImg.complete) {
    ctx.drawImage(shootImg, shootX - BTN_R, shootY - BTN_R, BTN_R * 2, BTN_R * 2);
  } else {
    ctx.fillStyle = '#ff4d35';
    ctx.beginPath();
    ctx.arc(shootX, shootY, BTN_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('射击', shootX, shootY);
  }

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

module.exports = { init, update, getInput, drawControls };