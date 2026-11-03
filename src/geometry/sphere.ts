import type { MeshData } from './types';


// Esfera centrada en el origen.

export function createSphere(radius: number, latSegments: number, lonSegments: number) : MeshData {
  const r = radius;
  const lat = Math.max(2, latSegments);
  const lon = Math.max(3, lonSegments);

  const vertices: number[] = [];

  // Vértices
  for (let i = 0; i <= lat; i++) {
    const phi = (i / lat) * Math.PI;       
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    for (let j = 0; j <= lon; j++) {
      const theta = (j / lon) * Math.PI * 2;
      const x = r * sinPhi * Math.cos(theta);
      const y = r * cosPhi;
      const z = r * sinPhi * Math.sin(theta);
      // Normal 
      vertices.push(x, y, z,  x / r, y / r, z / r);
    }
  }

  // Indices
  const indices: number[] = [];
  const stride = lon + 1;
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const a = i * stride + j;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
}