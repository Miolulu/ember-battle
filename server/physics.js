const TILE_SIZE = 40;
const MAP_WIDTH = 30;
const MAP_HEIGHT = 20;
const WORLD_WIDTH = MAP_WIDTH * TILE_SIZE;
const WORLD_HEIGHT = MAP_HEIGHT * TILE_SIZE;

function tileAt(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_WIDTH || ty >= MAP_HEIGHT) return 1;
  return map[ty][tx];
}

function isSolid(tile) {
  return tile === 1 || tile === 2;
}

function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function checkWallCollision(x, y, radius, map) {
  const minTx = Math.floor((x - radius) / TILE_SIZE);
  const maxTx = Math.floor((x + radius) / TILE_SIZE);
  const minTy = Math.floor((y - radius) / TILE_SIZE);
  const maxTy = Math.floor((y + radius) / TILE_SIZE);

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const tile = tileAt(map, tx, ty);
      if (!isSolid(tile)) continue;
      const rx = tx * TILE_SIZE;
      const ry = ty * TILE_SIZE;
      if (circleRectCollision(x, y, radius, rx, ry, TILE_SIZE, TILE_SIZE)) {
        return true;
      }
    }
  }
  return false;
}

function checkCircleCollision(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < r1 + r2;
}

function resolveWallCollision(x, y, radius, map) {
  let resolvedX = x;
  let resolvedY = y;

  for (let iter = 0; iter < 4; iter++) {
    const minTx = Math.floor((resolvedX - radius) / TILE_SIZE);
    const maxTx = Math.floor((resolvedX + radius) / TILE_SIZE);
    const minTy = Math.floor((resolvedY - radius) / TILE_SIZE);
    const maxTy = Math.floor((resolvedY + radius) / TILE_SIZE);

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const tile = tileAt(map, tx, ty);
        if (!isSolid(tile)) continue;

        const rx = tx * TILE_SIZE;
        const ry = ty * TILE_SIZE;
        const closestX = Math.max(rx, Math.min(resolvedX, rx + TILE_SIZE));
        const closestY = Math.max(ry, Math.min(resolvedY, ry + TILE_SIZE));
        const dx = resolvedX - closestX;
        const dy = resolvedY - closestY;
        const distSq = dx * dx + dy * dy;

        if (distSq < radius * radius && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          resolvedX += (dx / dist) * overlap;
          resolvedY += (dy / dist) * overlap;
        } else if (distSq === 0) {
          const centerX = rx + TILE_SIZE / 2;
          const centerY = ry + TILE_SIZE / 2;
          const cdx = resolvedX - centerX;
          const cdy = resolvedY - centerY;
          const push = radius + TILE_SIZE / 2;
          const len = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
          resolvedX = centerX + (cdx / len) * push;
          resolvedY = centerY + (cdy / len) * push;
        }
      }
    }
  }

  resolvedX = Math.max(radius, Math.min(WORLD_WIDTH - radius, resolvedX));
  resolvedY = Math.max(radius, Math.min(WORLD_HEIGHT - radius, resolvedY));

  return { x: resolvedX, y: resolvedY };
}

module.exports = {
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  tileAt,
  isSolid,
  checkWallCollision,
  checkCircleCollision,
  resolveWallCollision,
};
