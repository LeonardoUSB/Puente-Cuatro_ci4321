import type { MeshData } from './types';

/**
 * Caja rectangular CENTRADA EN EL ORIGEN.
 * Tamaños: width en X, height en Y, depth en Z. Todos son la longitud total,
 * no la mitad: createBox(2, 1, 0.5) da una caja de 2×1×0.5 con su centro en (0,0,0).
 *
 * 24 vértices (4 por cara), no 8 esquinas: cada cara necesita su propia normal
 * para que la luz se vea "plana" (flat shading).
 * Winding CCW visto desde fuera de cada cara → compatible con gl.CULL_FACE.
 */
export function createBox(width: number, height: number, depth: number): MeshData {
  const w = width  / 2;
  const h = height / 2;
  const d = depth  / 2;

  const vertices = new Float32Array([
    //   x    y    z    nx  ny  nz
    // +Z (front)
    -w, -h,  d,   0,  0,  1,
     w, -h,  d,   0,  0,  1,
     w,  h,  d,   0,  0,  1,
    -w,  h,  d,   0,  0,  1,
    // -Z (back)
     w, -h, -d,   0,  0, -1,
    -w, -h, -d,   0,  0, -1,
    -w,  h, -d,   0,  0, -1,
     w,  h, -d,   0,  0, -1,
    // +X (right)
     w, -h,  d,   1,  0,  0,
     w, -h, -d,   1,  0,  0,
     w,  h, -d,   1,  0,  0,
     w,  h,  d,   1,  0,  0,
    // -X (left)
    -w, -h, -d,  -1,  0,  0,
    -w, -h,  d,  -1,  0,  0,
    -w,  h,  d,  -1,  0,  0,
    -w,  h, -d,  -1,  0,  0,
    // +Y (top)
    -w,  h,  d,   0,  1,  0,
     w,  h,  d,   0,  1,  0,
     w,  h, -d,   0,  1,  0,
    -w,  h, -d,   0,  1,  0,
    // -Y (bottom)
    -w, -h, -d,   0, -1,  0,
     w, -h, -d,   0, -1,  0,
     w, -h,  d,   0, -1,  0,
    -w, -h,  d,   0, -1,  0,
  ]);

  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3,  // +Z
     4,  5,  6,   4,  6,  7,  // -Z
     8,  9, 10,   8, 10, 11,  // +X
    12, 13, 14,  12, 14, 15,  // -X
    16, 17, 18,  16, 18, 19,  // +Y
    20, 21, 22,  20, 22, 23,  // -Y
  ]);

  return { vertices, indices };
}