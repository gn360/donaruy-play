import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import skylineUrl from '../assets/game/bg/skyline-lejana.svg';
import fachadasUrl from '../assets/game/bg/fachadas.svg';

// ─────────────────────────────────────────────────────────────────────────────
//  MICHI RUNNER — réplica del dinosaurio de Chrome, con un gato naranja
//  corriendo por una calle de Montevideo (8-bit).
// ─────────────────────────────────────────────────────────────────────────────

let W = 900;
let H = 400;
let GROUND = 332; // línea del asfalto (pies del gato)
let CAT_X = 150;
const CAT_W = 46;
const CAT_H = 54; // alto parado
const DUCK_H = 30; // alto agachado
const GRAVITY = 2300;
const JUMP_V = 690; // pico de salto ≈ 103px
const BASE_SPEED = 280;
const MAX_SPEED = 560;

const BEST_KEY = 'michi-runner-best';

type Mode = 'ready' | 'playing' | 'over';
type ObstacleKind = 'trash' | 'sign' | 'dog';
type PowerType = 'tuna' | 'yarn';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Obstacle {
  kind: ObstacleKind;
  worldX: number;
  w: number;
  hit: boolean;
}

interface Block {
  worldX: number;
  y: number; // top (screen)
  w: number;
  h: number;
  popped: boolean;
  bob: number;
}

interface Power {
  type: PowerType;
  worldX: number;
  bottomY: number;
  vy: number;
  grounded: boolean;
  t: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface GameState {
  mode: Mode;
  distance: number;
  score: number;
  best: number;
  lives: number;
  speed: number;
  shake: number;

  catBottom: number; // pies (y de pantalla)
  vy: number;
  onGround: boolean;
  ducking: boolean;
  anim: number;

  invincible: number; // bola de estambre
  boost: number; // lata de atún
  hurt: number; // i-frames tras perder vida

  obstacles: Obstacle[];
  blocks: Block[];
  powers: Power[];
  particles: Particle[];

  nextSpawnX: number;
  spawnKindCounter: number;
}

// ── Utilidades ────────────────────────────────────────────────────────────────

function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Adapta la resolución interna del canvas: vertical en móvil, apaisada en desktop.
function applyLayout(canvas: HTMLCanvasElement) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vh > vw) {
    // pantalla vertical (móvil)
    const cssW = Math.min(vw - 32, 900);
    const aspect = Math.min(Math.max((vh - 96) / cssW, 1.2), 1.8);
    W = 480;
    H = Math.round(W * aspect);
    GROUND = H - Math.round(H * 0.3); // calle alta: la acción queda sobre los botones
    CAT_X = 96;
  } else {
    // pantalla apaisada (desktop o móvil horizontal)
    W = 900;
    H = 400;
    GROUND = 332;
    CAT_X = 150;
  }
  canvas.width = W;
  canvas.height = H;
}

// ── Tiras de fondo SVG (se rasterizan una vez y se dibujan en loop) ────────────

let skylineCanvas: HTMLCanvasElement | null = null;
let fachadasCanvas: HTMLCanvasElement | null = null;

function drawLoopStrip(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, offset: number, baseY: number) {
  const w = canvas.width;
  const h = canvas.height;
  let x = -(offset % w) - w;
  while (x < W) {
    ctx.drawImage(canvas, x, baseY - h, w, h);
    x += w;
  }
}

function rasterize(img: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cx = c.getContext('2d');
  if (cx) {
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, 0, 0, w, h);
  }
  return c;
}

function loadBackgroundImages() {
  const load = (url: string, key: 'skyline' | 'fachadas') => {
    const img = new Image();
    img.onload = () => {
      const c = rasterize(img, 1200, 200);
      if (key === 'skyline') skylineCanvas = c;
      else fachadasCanvas = c;
    };
    img.src = url;
  };
  load(skylineUrl, 'skyline');
  load(fachadasUrl, 'fachadas');
}

// ── Cajas de colisión por obstáculo (y de pantalla) ────────────────────────────

function obstacleBoxes(kind: ObstacleKind, x: number, w: number): Rect[] {
  switch (kind) {
    case 'trash':
      return [{ x, y: GROUND - 44, w, h: 44 }];
    case 'sign':
      // pizarra colgante: hay que pasar POR DEBAJO (agacharse)
      return [{ x, y: GROUND - 86, w, h: 50 }];
    case 'dog':
      return [{ x, y: GROUND - 42, w, h: 42 }];
  }
}

// ── Fondo: cielo, nubes, silueta de Montevideo (8-bit) ────────────────────────

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  r(ctx, x, y, 24 * s, 10 * s, '#ffffff');
  r(ctx, x + 4 * s, y - 6 * s, 14 * s, 8 * s, '#ffffff');
  r(ctx, x - 6 * s, y + 2 * s, 10 * s, 6 * s, '#f0f7fb');
}

function drawBackground(ctx: CanvasRenderingContext2D, g: GameState) {
  // cielo celeste
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#8fd4f2');
  sky.addColorStop(1, '#e4f6fd');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND);

  // nubes (parallax 0.08)
  const cloudPar = 0.08;
  for (let i = 0; i < 5; i++) {
    const worldX = i * 260 + 40;
    const sx = ((worldX - g.distance * cloudPar) % (W + 200) + (W + 200)) % (W + 200) - 100;
    drawCloud(ctx, sx, 24 + (i / 5) * Math.max(120, GROUND - 300), 0.8 + (i % 2) * 0.4);
  }

  // skyline lejana (parallax 0.16) — tira SVG en loop
  const farPar = 0.16;
  const farOffset = g.distance * farPar;
  if (skylineCanvas) {
    drawLoopStrip(ctx, skylineCanvas, farOffset, GROUND - 6);
  }

  // fachadas de comercios/almacenes (parallax 0.5) — tira SVG en loop
  const midPar = 0.5;
  const midOffset = g.distance * midPar;
  if (fachadasCanvas) {
    drawLoopStrip(ctx, fachadasCanvas, midOffset, GROUND);
  }

  // calle
  r(ctx, 0, GROUND, W, H - GROUND, '#3a3f46');
  // cordón / vereda
  r(ctx, 0, GROUND - 8, W, 8, '#9aa3ad');
  r(ctx, 0, GROUND - 8, W, 2, '#c2c8cf');
  // línea de carril discontinua
  ctx.fillStyle = '#e8e8e8';
  const dashW = 46;
  const dashGap = 46;
  const period = dashW + dashGap;
  const roadOffset = g.distance % period;
  for (let sx = -roadOffset; sx < W + period; sx += period) {
    r(ctx, sx, GROUND + 30, dashW, 5, '#e8e8e8');
  }
}

// ── Gato naranja (8-bit) ───────────────────────────────────────────────────────

function drawCat(ctx: CanvasRenderingContext2D, g: GameState) {
  const feet = g.catBottom;
  const height = g.ducking ? DUCK_H : CAT_H;
  const top = feet - height;
  const cx = CAT_X + CAT_W / 2;

  // parpadeo de i-frames
  if (g.hurt > 0 && Math.floor(g.hurt * 12) % 2 === 0) return;

  // color base (arcoíris al ser intocable)
  let body = '#f28c28';
  let bodyDark = '#d9741a';
  if (g.invincible > 0) {
    const hue = (Date.now() / 8) % 360;
    body = `hsl(${hue}, 85%, 55%)`;
    bodyDark = `hsl(${hue}, 80%, 45%)`;
  }

  const run = Math.sin(g.anim);
  const legSwing = g.onGround && g.mode === 'playing' ? Math.round(run * 6) : 0;

  // cola
  r(ctx, cx + 16, top + 6, 16, 6, bodyDark);
  r(ctx, cx + 28, top + 2, 6, 8, bodyDark);

  // patas trasera/delantera (animación)
  if (g.ducking) {
    r(ctx, cx - 16, feet - 10, 12, 10, bodyDark);
    r(ctx, cx + 4, feet - 10, 12, 10, bodyDark);
  } else {
    r(ctx, cx - 16 + legSwing, feet - 12, 12, 12, bodyDark);
    r(ctx, cx + 4 - legSwing, feet - 12, 12, 12, bodyDark);
  }

  // cuerpo
  const bodyH = g.ducking ? 22 : 34;
  r(ctx, cx - 17, feet - bodyH - 12, 34, bodyH, body);
  r(ctx, cx - 17, feet - bodyH - 12, 34, 6, bodyDark);

  // pecho blanco
  r(ctx, cx - 6, feet - bodyH - 2, 14, 10, '#ffffff');

  // cabeza
  const headY = g.ducking ? feet - 30 : top;
  r(ctx, cx - 15, headY, 30, 20, body);
  // orejas
  r(ctx, cx - 15, headY - 8, 9, 10, body);
  r(ctx, cx + 6, headY - 8, 9, 10, body);
  r(ctx, cx - 13, headY - 6, 5, 6, '#f7b26a');
  r(ctx, cx + 8, headY - 6, 5, 6, '#f7b26a');

  // cara
  r(ctx, cx - 9, headY + 6, 5, 6, '#1a1a1a');
  r(ctx, cx + 4, headY + 6, 5, 6, '#1a1a1a');
  r(ctx, cx - 6, headY + 11, 4, 2, '#e26a6a');
  r(ctx, cx + 2, headY + 11, 4, 2, '#e26a6a');
  // bigotes
  r(ctx, cx - 13, headY + 10, 5, 2, '#ffffff');
  r(ctx, cx + 8, headY + 10, 5, 2, '#ffffff');
  r(ctx, cx - 13, headY + 13, 5, 2, '#ffffff');
  r(ctx, cx + 8, headY + 13, 5, 2, '#ffffff');

  // efecto de intocable (destellos)
  if (g.invincible > 0) {
    for (let i = 0; i < 4; i++) {
      const a = (Date.now() / 100 + i * 90) % 360;
      const px = cx + Math.cos((a * Math.PI) / 180) * 30;
      const py = top + 14 + Math.sin((a * Math.PI) / 180) * 24;
      r(ctx, px, py, 4, 4, '#ffe680');
    }
  }
}

// ── Obstáculos ─────────────────────────────────────────────────────────────────

function drawTrash(ctx: CanvasRenderingContext2D, x: number) {
  const y = GROUND - 44;
  r(ctx, x, y, 38, 44, '#3f7d3a');
  r(ctx, x, y, 38, 6, '#2f5f2c');
  r(ctx, x + 4, y + 10, 30, 4, '#2f5f2c');
  r(ctx, x + 6, y + 24, 26, 12, '#356b31');
  // ruedas
  r(ctx, x + 2, GROUND - 6, 8, 6, '#222');
  r(ctx, x + 28, GROUND - 6, 8, 6, '#222');
}

function drawSign(ctx: CanvasRenderingContext2D, x: number) {
  // postes laterales + pizarra colgante
  r(ctx, x, GROUND - 90, 6, 90, '#6b5a3f');
  r(ctx, x + 40, GROUND - 90, 6, 90, '#6b5a3f');
  r(ctx, x + 2, GROUND - 86, 42, 4, '#574a34');
  // pizarra
  r(ctx, x - 4, GROUND - 86, 54, 50, '#7a5a3a');
  r(ctx, x - 1, GROUND - 83, 48, 44, '#2e4a3b');
  // tiza
  ctx.fillStyle = '#e8f0e8';
  ctx.font = 'bold 12px "Raleway", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ALMACÉN', x + 23, GROUND - 61);
  r(ctx, x + 4, GROUND - 48, 20, 3, '#cfe3d4');
  r(ctx, x + 4, GROUND - 44, 14, 3, '#cfe3d4');
}

function drawDog(ctx: CanvasRenderingContext2D, x: number, anim: number) {
  const s = Math.round(Math.sin(anim) * 3);
  const black = '#141414';
  const dark = '#000000';
  // patas (animadas)
  r(ctx, x + 6, GROUND - 12 + s, 7, 12, dark);
  r(ctx, x + 16, GROUND - 12 - s, 7, 12, dark);
  r(ctx, x + 26, GROUND - 12 + s, 7, 12, dark);
  // cuerpo
  r(ctx, x + 4, GROUND - 30, 28, 18, black);
  // cola
  r(ctx, x - 1, GROUND - 34, 6, 10, black);
  // cabeza
  r(ctx, x + 28, GROUND - 40, 16, 16, black);
  // orejas
  r(ctx, x + 29, GROUND - 44, 6, 6, black);
  r(ctx, x + 38, GROUND - 43, 5, 5, black);
  // ojo blanco
  r(ctx, x + 34, GROUND - 37, 6, 6, '#ffffff');
  r(ctx, x + 36, GROUND - 35, 3, 3, '#000000');
  // nariz (punta del hocico)
  r(ctx, x + 43, GROUND - 34, 3, 3, '#d8d8d8');
}

// ── Bloques y poderes ──────────────────────────────────────────────────────────

function drawBlock(ctx: CanvasRenderingContext2D, b: Block, g: GameState) {
  if (b.popped) return;
  const sx = b.worldX - g.distance;
  const bob = Math.sin(b.bob) * 2;
  const y = b.y + bob;
  r(ctx, sx - 2, y - 2, b.w + 4, b.h + 4, '#5b3d1a');
  r(ctx, sx, y, b.w, b.h, '#d99a2b');
  r(ctx, sx, y, b.w, 5, '#efb84a');
  r(ctx, sx, y + b.h - 5, b.w, 5, '#b5791e');
  // tuercas
  r(ctx, sx + 2, y + 2, 4, 4, '#8a5c14');
  r(ctx, sx + b.w - 6, y + 2, 4, 4, '#8a5c14');
  r(ctx, sx + 2, y + b.h - 6, 4, 4, '#8a5c14');
  r(ctx, sx + b.w - 6, y + b.h - 6, 4, 4, '#8a5c14');
  // ?
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px "Raleway", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', sx + b.w / 2, y + b.h / 2 + 1);
}

function drawPower(ctx: CanvasRenderingContext2D, p: Power, g: GameState) {
  const sx = p.worldX - g.distance;
  const y = p.bottomY;
  const bounce = p.grounded ? Math.abs(Math.sin(p.t * 4)) * 4 : 0;
  const yy = y - 24 + bounce;
  if (p.type === 'tuna') {
    // lata de atún
    r(ctx, sx - 14, yy + 6, 28, 18, '#cfd4dc');
    r(ctx, sx - 14, yy + 2, 28, 6, '#b9c0c9');
    r(ctx, sx - 14, yy + 22, 28, 2, '#9aa3ad');
    r(ctx, sx - 8, yy + 9, 16, 12, '#0C4AB5');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px "Raleway", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ATÚN', sx, yy + 15);
    // pescadito
    r(ctx, sx + 4, yy + 4, 8, 4, '#083790');
  } else {
    // bola de estambre
    r(ctx, sx - 13, yy, 26, 22, '#e04f8c');
    r(ctx, sx - 11, yy + 2, 22, 18, '#d33a78');
    ctx.strokeStyle = '#f28cba';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(sx + Math.cos(i) * 4, yy + 10 + Math.sin(i) * 4, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    // hilo
    r(ctx, sx - 4, yy - 4, 2, 6, '#fff');
  }
}

// ── HUD ────────────────────────────────────────────────────────────────────────

function drawHUD(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  // puntaje
  ctx.fillStyle = '#1a2340';
  ctx.font = 'bold 22px "Raleway", monospace';
  ctx.fillText('PUNTOS', 16, 16);
  ctx.fillStyle = '#0C4AB5';
  ctx.font = 'bold 30px "Raleway", monospace';
  ctx.fillText(String(Math.floor(g.score)), 16, 40);

  // vidas (gatitos)
  for (let i = 0; i < 3; i++) {
    const lx = W - 30 - i * 34;
    if (i < g.lives) {
      r(ctx, lx - 8, 14, 20, 14, '#f28c28');
      r(ctx, lx - 8, 10, 8, 6, '#f28c28');
      r(ctx, lx + 4, 10, 8, 6, '#f28c28');
      r(ctx, lx - 4, 18, 3, 4, '#1a1a1a');
      r(ctx, lx + 3, 18, 3, 4, '#1a1a1a');
    } else {
      ctx.fillStyle = '#c8cdd6';
      ctx.beginPath();
      ctx.arc(lx + 2, 22, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9aa3ad';
      ctx.beginPath();
      ctx.arc(lx + 2, 22, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // indicador de poderes activos
  let py = 84;
  if (g.boost > 0) {
    r(ctx, 16, py, 8, 8, '#083790');
    ctx.fillStyle = '#1a2340';
    ctx.font = 'bold 13px "Raleway", monospace';
    ctx.fillText('VELOCIDAD ' + g.boost.toFixed(1) + 's', 30, py - 1);
    py += 22;
  }
  if (g.invincible > 0) {
    r(ctx, 16, py, 8, 8, '#e04f8c');
    ctx.fillStyle = '#1a2340';
    ctx.font = 'bold 13px "Raleway", monospace';
    ctx.fillText('INTOCABLE ' + g.invincible.toFixed(1) + 's', 30, py - 1);
  }
}

// ── Lógica de juego ────────────────────────────────────────────────────────────

function createInitialState(best: number): GameState {
  return {
    mode: 'ready',
    distance: 0,
    score: 0,
    best,
    lives: 3,
    speed: BASE_SPEED,
    shake: 0,
    catBottom: GROUND,
    vy: 0,
    onGround: true,
    ducking: false,
    anim: 0,
    invincible: 0,
    boost: 0,
    hurt: 0,
    obstacles: [],
    blocks: [],
    powers: [],
    particles: [],
    nextSpawnX: W + 240,
    spawnKindCounter: 0,
  };
}

function spawnParticles(g: GameState, x: number, y: number, color: string, n: number) {
  for (let i = 0; i < n; i++) {
    g.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 160,
      vy: -Math.random() * 180 - 40,
      life: 0.6 + Math.random() * 0.5,
      maxLife: 1,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

// Separación variable entre apariciones: tramos cortos, medios y largos.
function nextGap(distance: number): number {
  const r = Math.random();
  let gap: number;
  if (r < 0.3) {
    gap = 130 + Math.random() * 60; // cercanos: 130–190
  } else if (r < 0.75) {
    gap = 210 + Math.random() * 100; // medios: 210–310
  } else {
    gap = 340 + Math.random() * 210; // bien separados: 340–550
  }
  // se acorta un poco a medida que el juego se acelera
  gap -= Math.min(35, distance * 0.00175);
  return Math.max(130, gap);
}

function spawnObstacle(g: GameState, x: number) {
  const weights: ObstacleKind[] = ['trash', 'trash', 'sign', 'sign', 'dog', 'dog'];
  const kind = weights[Math.floor(Math.random() * weights.length)];
  const w = kind === 'sign' ? 46 : kind === 'trash' ? 38 : 40;
  g.obstacles.push({ kind, worldX: x, w, hit: false });
}

function spawnBlockRow(g: GameState, x: number) {
  const count = Math.random() > 0.4 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const high = Math.random() > 0.45;
    const y = high ? GROUND - 70 - 30 : GROUND - 42 - 30;
    g.blocks.push({
      worldX: x + i * 44,
      y,
      w: 30,
      h: 30,
      popped: false,
      bob: Math.random() * Math.PI * 2,
    });
  }
}

function spawnPower(g: GameState, b: Block) {
  const type: PowerType = Math.random() > 0.5 ? 'tuna' : 'yarn';
  g.powers.push({
    type,
    worldX: b.worldX + b.w / 2,
    bottomY: b.y,
    vy: -180,
    grounded: false,
    t: 0,
  });
}

function loseLife(g: GameState) {
  g.lives -= 1;
  g.hurt = 1.4;
  g.shake = 12;
  spawnParticles(g, CAT_X + CAT_W / 2, g.catBottom - 20, '#f28c28', 14);
  if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
  if (g.lives <= 0) {
    g.mode = 'over';
    g.best = Math.max(g.best, Math.floor(g.score));
    try {
      localStorage.setItem(BEST_KEY, String(g.best));
    } catch {
      /* ignore */
    }
  }
}

function update(g: GameState, dt: number, duckHeld: boolean) {
  if (g.mode !== 'playing') return;

  // velocidad + distancia + puntaje
  const boostMult = g.boost > 0 ? 1.75 : 1;
  const target = Math.min(MAX_SPEED, BASE_SPEED + g.distance * 0.02);
  g.speed = target * boostMult;
  g.distance += g.speed * dt;
  g.score += g.speed * dt * 0.03;

  if (g.boost > 0) g.boost -= dt;
  if (g.invincible > 0) g.invincible -= dt;
  if (g.hurt > 0) g.hurt -= dt;
  if (g.shake > 0) g.shake -= dt * 40;

  g.anim += dt * (g.speed * 0.055);

  // física del gato
  g.ducking = duckHeld && g.onGround;
  if (!g.onGround) {
    g.vy += GRAVITY * dt;
    g.catBottom += g.vy * dt;
    if (g.catBottom >= GROUND) {
      g.catBottom = GROUND;
      g.vy = 0;
      g.onGround = true;
    }
  }

  const catH = g.ducking ? DUCK_H : CAT_H;
  const catTop = g.catBottom - catH;
  const catRect: Rect = { x: CAT_X, y: catTop, w: CAT_W, h: catH };

  // spawn
  if (g.distance >= g.nextSpawnX) {
    const x = g.distance + W + 80;
    if (Math.random() > 0.3) {
      spawnObstacle(g, x);
    } else {
      spawnBlockRow(g, x);
    }
    g.nextSpawnX = x + nextGap(g.distance);
  }

  // colisiones con obstáculos
  for (const o of g.obstacles) {
    if (o.hit) continue;
    const sx = o.worldX - g.distance;
    if (sx > W + 80 || sx + o.w < -60) continue;
    const boxes = obstacleBoxes(o.kind, sx, o.w);
    for (const b of boxes) {
      if (overlap(catRect, b)) {
        if (g.invincible > 0) {
          o.hit = true;
          g.score += 150;
          spawnParticles(g, sx + o.w / 2, (b.y + b.y + b.h) / 2, '#ffe680', 16);
        } else if (g.hurt <= 0) {
          loseLife(g);
        }
        break;
      }
    }
  }

  // bloques (golpear tipo Mario)
  for (const b of g.blocks) {
    if (b.popped) continue;
    b.bob += dt * 3;
    const sx = b.worldX - g.distance;
    if (sx > W + 80 || sx + b.w < -60) continue;
    if (overlap(catRect, { x: sx, y: b.y, w: b.w, h: b.h })) {
      b.popped = true;
      g.score += 50;
      spawnPower(g, b);
      spawnParticles(g, sx + b.w / 2, b.y + b.h / 2, '#d99a2b', 12);
    }
  }

  // poderes
  for (const p of g.powers) {
    p.t += dt;
    if (!p.grounded) {
      p.vy += GRAVITY * 0.85 * dt;
      p.bottomY += p.vy * dt;
      if (p.bottomY >= GROUND) {
        p.bottomY = GROUND;
        p.grounded = true;
      }
    }
    const sx = p.worldX - g.distance;
    const pr: Rect = { x: sx - 14, y: p.bottomY - 26, w: 28, h: 26 };
    if (overlap(catRect, pr)) {
      g.score += 120;
      spawnParticles(g, sx, p.bottomY - 12, p.type === 'tuna' ? '#0C4AB5' : '#e04f8c', 14);
      if (p.type === 'tuna') g.boost = 4;
      else g.invincible = 5;
      p.bottomY = -999; // marcar para eliminar
    }
  }

  // partículas
  for (const p of g.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 500 * dt;
  }

  // limpieza
  g.obstacles = g.obstacles.filter((o) => o.worldX - g.distance > -260);
  g.blocks = g.blocks.filter((b) => b.worldX - g.distance > -260);
  g.powers = g.powers.filter((p) => p.worldX - g.distance > -260 && p.bottomY !== -999);
  g.particles = g.particles.filter((p) => p.life > 0);
}

function render(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.save();
  if (g.shake > 0) {
    ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  }
  drawBackground(ctx, g);

  for (const b of g.blocks) drawBlock(ctx, b, g);
  for (const p of g.powers) drawPower(ctx, p, g);
  for (const o of g.obstacles) {
    const sx = o.worldX - g.distance;
    if (sx < -80 || sx > W + 80) continue;
    if (o.hit) continue;
    if (o.kind === 'trash') drawTrash(ctx, sx);
    else if (o.kind === 'sign') drawSign(ctx, sx);
    else drawDog(ctx, sx, g.anim);
  }
  drawCat(ctx, g);

  // partículas
  for (const p of g.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    r(ctx, p.x, p.y, p.size, p.size, p.color);
  }
  ctx.globalAlpha = 1;

  // líneas de velocidad al usar atún
  if (g.boost > 0 && g.mode === 'playing') {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const yy = 20 + ((i * 47 + Date.now() * 0.3) % (GROUND - 40));
      const xx = W - ((Date.now() * 1.2 + i * 130) % (W - 100));
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx - 50, yy);
      ctx.stroke();
    }
  }

  ctx.restore();
  drawHUD(ctx, g);
}

// ── Componente React ───────────────────────────────────────────────────────────

export default function MichiRunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gRef = useRef<GameState | null>(null);
  const duckRef = useRef(false);
  const [ui, setUi] = useState<{ mode: Mode; score?: number; best?: number }>({ mode: 'ready' });
  const lastUiMode = useRef<Mode>('ready');
  const [isTouch] = useState(
    () => window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0,
  );

  useEffect(() => {
    let best = 0;
    try {
      best = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch {
      /* ignore */
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    applyLayout(canvas);

    const g = createInitialState(best);
    gRef.current = g;
    loadBackgroundImages();

    const setUiIfChanged = (m: Mode, score?: number, bestVal?: number) => {
      if (lastUiMode.current !== m) {
        lastUiMode.current = m;
        setUi({ mode: m, score, best: bestVal });
      }
    };

    const start = () => {
      if (g.mode === 'ready' || g.mode === 'over') {
        const b = g.best;
        Object.assign(g, createInitialState(b));
        g.mode = 'playing';
        setUiIfChanged('playing');
      }
    };

    const jump = () => {
      if (g.mode !== 'playing') {
        start();
        return;
      }
      if (g.onGround) {
        g.vy = -JUMP_V;
        g.onGround = false;
        g.ducking = false;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (e.repeat) return;
        jump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        duckRef.current = true;
      } else if (e.code === 'Enter') {
        e.preventDefault();
        start();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        duckRef.current = false;
      }
    };
    const onPointerDown = () => {
      jump();
    };

    const onResize = () => {
      applyLayout(canvas);
      const gg = gRef.current;
      if (gg && gg.onGround) gg.catBottom = GROUND;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      update(g, dt, duckRef.current);
      if (g.mode === 'over') {
        setUiIfChanged('over', Math.floor(g.score), g.best);
      }
      render(ctx, g);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const handleJump = () => {
    const g = gRef.current;
    if (!g) return;
    if (g.mode !== 'playing') {
      Object.assign(g, createInitialState(g.best));
      g.mode = 'playing';
      lastUiMode.current = 'playing';
      setUi({ mode: 'playing' });
      return;
    }
    if (g.onGround) {
      g.vy = -JUMP_V;
      g.onGround = false;
      g.ducking = false;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex flex-col font-sans">
      <header className="bg-[#0C4AB5] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <Link to="/" className="flex items-center gap-2 text-white/90 hover:text-white">
          <ArrowLeft size={20} />
          <span className="font-semibold">Volver</span>
        </Link>
        <h1 className="text-xl md:text-2xl font-bold tracking-wide text-center">Michi Runner — Montevideo</h1>
        <div className="w-20" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-[900px] select-none">
          <canvas
            ref={canvasRef}
            className="w-full h-auto rounded-2xl shadow-2xl border-4 border-[#1e2b45] touch-none"
            style={{ imageRendering: 'pixelated', background: '#8fd4f2' }}
          />

          {/* Overlay: listo */}
          {ui.mode === 'ready' && (
            <div className="absolute inset-0 rounded-2xl bg-black/55 flex flex-col items-center justify-center text-center p-6">
              <div className="text-6xl mb-3">🐱</div>
              <h2 className="text-3xl font-black mb-2">Michi Runner</h2>
              <p className="text-white/90 mb-4 max-w-md">
                El gato naranja recorre las calles de Montevideo. Esquivá obstáculos y sumá puntos.
              </p>
              <div className="text-left text-sm text-white/85 bg-black/30 rounded-xl p-4 mb-5 max-w-md">
                <p className="font-bold mb-2">Cómo jugar:</p>
                {!isTouch && (
                  <p className="flex items-center gap-1">
                    <ArrowUp size={14} /> / Espacio — saltar · <ArrowDown size={14} /> — agacharse
                  </p>
                )}
                {isTouch && (
                  <p className="flex items-center gap-1 flex-wrap">
                    Tocá la pantalla o el botón <ArrowUp size={14} /> (derecha) para saltar · mantené el botón <ArrowDown size={14} /> (izquierda) para agacharte
                  </p>
                )}
                <p>🗑️ Contenedores y 🐕 perros: <b>saltá</b></p>
                <p>🪧 Pizarras de almacén: <b>agachate</b></p>
                <p>🧱 Golpeá bloques: 🥫 atún = velocidad · 🧶 estambre = intocable</p>
              </div>
              <button
                onClick={handleJump}
                className="px-8 py-3 rounded-xl bg-[#FDC300] text-[#1a2340] font-black text-lg hover:bg-[#efb400] shadow-lg"
              >
                ¡Jugar!
              </button>
            </div>
          )}

          {/* Overlay: game over */}
          {ui.mode === 'over' && (
            <div className="absolute inset-0 rounded-2xl bg-black/60 flex flex-col items-center justify-center text-center p-6">
              <h2 className="text-3xl font-black mb-2">¡Fin del juego!</h2>
              <p className="text-5xl font-black text-[#FDC300] mb-2">{ui.score ?? 0}</p>
              <p className="text-white/80 mb-1">puntos</p>
              <p className="text-white/60 mb-5">Récord: {ui.best ?? 0}</p>
              <button
                onClick={handleJump}
                className="px-8 py-3 rounded-xl bg-[#FDC300] text-[#1a2340] font-black text-lg hover:bg-[#efb400] shadow-lg"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Botones flotantes táctiles (solo en dispositivos táctiles) */}
        {isTouch && (
          <>
            <button
              onPointerDown={(e) => { e.preventDefault(); duckRef.current = true; }}
              onPointerUp={() => (duckRef.current = false)}
              onPointerLeave={() => (duckRef.current = false)}
              onPointerCancel={() => (duckRef.current = false)}
              className="fixed bottom-6 left-6 z-50 w-20 h-20 rounded-full bg-[#1e2b45]/90 backdrop-blur-sm border-2 border-white/20 text-white flex flex-col items-center justify-center shadow-xl active:bg-[#2c3d5f] touch-none select-none"
            >
              <ArrowDown size={36} strokeWidth={3} />
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); handleJump(); }}
              className="fixed bottom-6 right-6 z-50 w-20 h-20 rounded-full bg-[#FDC300] text-[#1a2340] flex flex-col items-center justify-center shadow-xl active:bg-[#efb400] touch-none select-none"
            >
              <ArrowUp size={36} strokeWidth={3} />
            </button>
          </>
        )}
      </main>
    </div>
  );
}