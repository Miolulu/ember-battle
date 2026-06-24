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