// Scene constants: geometry, colors and canvas settings. main.ts holds the WebGL code and the game loop.

//Usar clear color como color del cielo
export const CLEAR_COLOR: readonly [number, number, number, number] = [0x4f / 255, 0xa8 / 255, 0xe0 / 255, 1];

/** Drawing buffer size in pixels, 4:3. CSS scales the canvas to fit the window; the buffer stays fixed. */
export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 768;

/** Cube colors, RGBA. Space cycles through them in this order. */
export const COLORS: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 1, 1], // cyan
  [1, 0, 1, 1], // magenta
  [1, 1, 0, 1], // yellow
];

// 24 vertices (4 per face), not 8 corners. A corner is shared by 3 faces, but a vertex holds
// only one normal. Each face needs its own normal for flat lighting, so each face gets its own 4 vertices.
/** Interleaved vertex data: x, y, z, nx, ny, nz per vertex. Half-size 0.5, counter-clockwise seen from outside. */
export const CUBE_VERTICES = new Float32Array([
  //   x      y      z    nx  ny  nz
  // +Z face (front)
  -0.5, -0.5,  0.5,   0,  0,  1, // bottom left
   0.5, -0.5,  0.5,   0,  0,  1, // bottom right
   0.5,  0.5,  0.5,   0,  0,  1, // top right
  -0.5,  0.5,  0.5,   0,  0,  1, // top left
  // -Z face (back)
   0.5, -0.5, -0.5,   0,  0, -1,
  -0.5, -0.5, -0.5,   0,  0, -1,
  -0.5,  0.5, -0.5,   0,  0, -1,
   0.5,  0.5, -0.5,   0,  0, -1,
  // +X face (right)
   0.5, -0.5,  0.5,   1,  0,  0,
   0.5, -0.5, -0.5,   1,  0,  0,
   0.5,  0.5, -0.5,   1,  0,  0,
   0.5,  0.5,  0.5,   1,  0,  0,
  // -X face (left)
  -0.5, -0.5, -0.5,  -1,  0,  0,
  -0.5, -0.5,  0.5,  -1,  0,  0,
  -0.5,  0.5,  0.5,  -1,  0,  0,
  -0.5,  0.5, -0.5,  -1,  0,  0,
  // +Y face (top)
  -0.5,  0.5,  0.5,   0,  1,  0,
   0.5,  0.5,  0.5,   0,  1,  0,
   0.5,  0.5, -0.5,   0,  1,  0,
  -0.5,  0.5, -0.5,   0,  1,  0,
  // -Y face (bottom)
  -0.5, -0.5, -0.5,   0, -1,  0,
   0.5, -0.5, -0.5,   0, -1,  0,
   0.5, -0.5,  0.5,   0, -1,  0,
  -0.5, -0.5,  0.5,   0, -1,  0,
]);

/** Two triangles per face, 36 indices. Each face: (0, 1, 2) and (0, 2, 3), both counter-clockwise. */
export const CUBE_INDICES = new Uint16Array([
   0,  1,  2,   0,  2,  3, // +Z
   4,  5,  6,   4,  6,  7, // -Z
   8,  9, 10,   8, 10, 11, // +X
  12, 13, 14,  12, 14, 15, // -X
  16, 17, 18,  16, 18, 19, // +Y
  20, 21, 22,  20, 22, 23, // -Y
]);

export const TABLE = new Float32Array([
// x    y     z    nx  ny  nz
  -5,   0,   20,   0,  1,  0,  // v0 frente-izquierda
   5,   0,   20,   0,  1,  0,  // v1 frente-derecha
   5,   0,  -20,   0,  1,  0,  // v2 fondo-derecha
  -5,   0,  -20,   0,  1,  0,  // v3 fondo-izquierda
]);

//Dos triangulos, CCW visto desde +Y
export const TABLE_INDEX = new Uint16Array([
  0, 1, 2,
  0, 2, 3,
]);

export const FLOOR_COLOR: readonly [number, number, number, number] = [0x8b / 255, 0x5a / 255, 0x2b / 255, 1];
export const FLOOR_AMBIENT: readonly [number, number, number, number] = [0x5a / 255, 0x3a / 255, 0x1b / 255, 1];

export const STRIDE_BYTES = 6 * 4; // 4 bytes per float (Float32)
export const NORMAL_OFFSET_BYTES = 3 * 4;

// Torreta
export const BODY_HEIGHT   = 0.6;     
export const TURRET_RADIUS = 0.35;     
export const CANNON_RADIUS = 0.06;     
export const CANNON_LENGTH = 1.0;      
export const BULLET_RADIUS = 0.10;     

// Indicador de fuerza (barras)
export const BAR_WIDTH   = 0.5;
export const BAR_HEIGHT  = 0.06;
export const BAR_DEPTH   = 0.02;
export const BAR_SPACING = 0.03;
export const BODY_DEPTH  = 0.8;

// Colores: verde oscuro (apagado) y verde claro (encendido)
export const BAR_OFF_AMBIENT: readonly [number, number, number, number] = [0.0, 0.1, 0.0, 1];
export const BAR_OFF_COLOR:   readonly [number, number, number, number] = [0.0, 0.3, 0.0, 1];

export const BAR_ON_AMBIENT:  readonly [number, number, number, number] = [0.1, 0.4, 0.1, 1];
export const BAR_ON_COLOR:    readonly [number, number, number, number] = [0.3, 0.9, 0.3, 1];

// Multiplicadores de velocidad segun el nivel de fuerza (1, 2, 3)
export const FORCE_MULTIPLIERS = [1.0, 1.5, 2.0];

// Colores
export const TURRET_AMBIENT: readonly [number, number, number, number] = [0.10, 0.10, 0.10, 1];
export const TURRET_COLOR:   readonly [number, number, number, number] = [0.25, 0.25, 0.25, 1];

export const CANNON_AMBIENT: readonly [number, number, number, number] = [0.05, 0.05, 0.05, 1];
export const CANNON_COLOR:   readonly [number, number, number, number] = [0.18, 0.18, 0.18, 1];

export const BULLET_AMBIENT: readonly [number, number, number, number] = [0.00, 0.00, 0.00, 1];
export const BULLET_COLOR:   readonly [number, number, number, number] = [0.05, 0.05, 0.05, 1];

//  Elevacion inicial (radianes)
export const INITIAL_ELEVATION = (75 * Math.PI) / 180;

// Limites de la torreta 
export const X_MIN = -3.0;
export const X_MAX =  3.0;

// Limites de elevacion (radianes) 
export const MIN_ELEVATION = (5  * Math.PI) / 180;   // 5°
export const MAX_ELEVATION = (90 * Math.PI) / 180;   // 90°

// Velocidades (por segundo)
export const HORIZONTAL_SPEED = 3.0;   // unidades/segundo
export const ELEVATION_SPEED  = 1.5;   // radianes/segundo

// Fisica del proyectil 
export const GRAVITY = 9.8;          // unidades/segundo al cuadradado
export const BASE_SPEED = 8.0;       // velocidad inicial de la bala 