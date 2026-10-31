import type { MeshData } from './types';


//Cilindro ABIERTO (tubo), centrado en el origen, eje a lo largo de Y.

export function createCylinder(
  radius: number,
  height: number,
  segments: number,
): MeshData {
  const r = radius;
  const h = height / 2;
  const N = Math.max(3, segments);

  const vertices: number[] = [];
  const indices: number[] = [];

  // Anillo inferior 
  for (let i = 0; i < N; i++) {
    const theta = (i / N) * Math.PI * 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    vertices.push(r * c, -h, r * s,  c, 0, s);
  }

  // Anillo superior 
  for (let i = 0; i < N; i++) {
    const theta = (i / N) * Math.PI * 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    vertices.push(r * c,  h, r * s,  c, 0, s);
  }

  // Indices triangulos por segmento del lateral 
  for (let i = 0; i < N; i++) {
    const b0 = i;
    const b1 = (i + 1) % N;
    const t0 = N + i;
    const t1 = N + ((i + 1) % N);
    indices.push(b0, t0, t1);
    indices.push(b0, t1, b1);
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
}