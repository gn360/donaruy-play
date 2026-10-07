# Sprites SVG — Michi Runner

Referencia del arte del juego: qué está en uso, qué es procedural y qué se
puede sumar después.

## Estado actual

| Recurso | Origen |
|---|---|
| Fondo de cielo | Celeste, dibujado en código (gradiente `#8fd4f2 → #e4f6fd`) |
| Skyline lejana (parallax 0.16) | `bg/skyline-lejana.svg` (1200 × 200, con leve blur) |
| Fachadas de comercios (parallax 0.5) | `bg/fachadas.svg` (1200 × 200) |
| Monumentos (Salvo, Antel, Ciudadela, cartel) | Incluidos en `bg/skyline-lejana.svg` |
| Obstáculos (contenedor, perro, pizarra) | Procedural en código |
| Poderes (atún, estambre) | Procedural en código |

## Carpetas

```
frontend/src/assets/game/
├── bg/          # tiras de skyline en loop
├── obstacles/   # (vacío: los obstáculos son procedurales)
└── powers/      # (vacío: los poderes son procedurales)
```

## Referencias del canvas

- Canvas del juego: 900 × 400 px.
- Línea del asfalto (GROUND): y = 332 (medido desde arriba).
- El gato corre sobre esa línea; hitbox ≈ 46 × 54 px parado, 46 × 30 agachado.

## Tiras de fondo (en uso)

- `skyline-lejana.svg` — edificios de la capa lejana, base en y ≈ 326. Se
  rasteriza una vez y se dibuja en loop con wrap (parallax 0.16).
- `fachadas.svg` — fachadas de comercios/almacenes, base en y = 332, se dibuja
  en loop (parallax 0.5).

Reglas si se reemplazan/agregan tiras:

- **Bordes tileables**: el borde izquierdo y el derecho deben coincidir para que
  el loop no se note (medio edificio cortado en ambos extremos, o cielo despejado
  en ambos bordes).
- **Sin texto ni carteles** dentro de la tira (a veces se espeja para variar, y
  el texto quedaría al revés).
- **Sin monumentos únicos** dentro de la tira (van como sprites sueltos).
- Definir `viewBox` explícito (el motor rasteriza a 1200 × 200).

## Monumentos

Los monumentos (Palacio Salvo, Torre Antel, Puerta de la Ciudadela y el cartel
"MONTEVIDEO") ya están dibujados dentro de `bg/skyline-lejana.svg`; no se
dibujan por código.

## Obstáculos (procedural, sin SVG)

Los obstáculos se generan por código (dibujo `fillRect`) con estas cajas de
colisión:

- **Contenedor de basura** — 38 × 44 px, en el suelo. Se salta.
- **Perro** — 40 × 42 px (negro, con ojo blanco), en el suelo. Se salta.
- **Pizarra de almacén** — 46 px de ancho, tabla entre 36 y 86 px de altura.
  Se pasa por debajo (agacharse).

> Los autos y el semáforo fueron eliminados del juego.

## Poderes (procedural, sin SVG)

- **Lata de atún** (velocidad) — 28 × 24 px.
- **Bola de estambre** (intocable) — 26 × 22 px.