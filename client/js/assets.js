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
