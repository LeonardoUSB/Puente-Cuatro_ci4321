// Rotating cube, FixedFunction (FF) version.
import './style.css';
import { mat3, mat4 } from 'gl-matrix';
import { ATTRIB, createFixedFunction, LIGHTING } from './vendor/ff/ff';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CLEAR_COLOR,
  COLORS,
  TABLE,
  TABLE_INDEX,
  FLOOR_COLOR,
  FLOOR_AMBIENT,
  NORMAL_OFFSET_BYTES,
  STRIDE_BYTES,
} from './constants';
import { createBox } from './geometry/box';
import { createCylinder } from './geometry/cylinder';
import { createSphere } from './geometry/sphere';

type FF = ReturnType<typeof createFixedFunction>;

const ROTATION_SPEED = 0.0; 
const MAX_DT = 0.1; // seconds

// Step 1. Get the WebGL2 context.
function getContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2');
  if (!gl) throw new Error('WebGL2 is not available.');
  return gl;
}

// Step 2. Shaders and program: FF creates and owns them.
// Step 3. Vertex specification: copy the vertex and index data to the GPU.
function createVertexBuffer(gl: WebGL2RenderingContext, data: Float32Array): WebGLBuffer {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

function createIndexBuffer(gl: WebGL2RenderingContext, data: Uint16Array): WebGLBuffer {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

// Step 4. Describe how the vertex data is laid out, using FF's attribute slots.
// No ATTRIB.COLOR: lit colors come from the material.
function createVAO(gl: WebGL2RenderingContext, vertices: WebGLBuffer, indices: WebGLBuffer): WebGLVertexArrayObject {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.enableVertexAttribArray(ATTRIB.POSITION);
  gl.vertexAttribPointer(ATTRIB.POSITION, 3, gl.FLOAT, false, STRIDE_BYTES, 0);
  gl.enableVertexAttribArray(ATTRIB.NORMAL);
  gl.vertexAttribPointer(ATTRIB.NORMAL, 3, gl.FLOAT, false, STRIDE_BYTES, NORMAL_OFFSET_BYTES);
  // The VAO remembers the ELEMENT_ARRAY_BUFFER bound while it is bound.
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bindVertexArray(null);
  return vao;
}

// Step 5. Pipeline state: canvas size, viewport, clear color, depth test, face culling.
function setupState(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): void {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(...CLEAR_COLOR);
  gl.enable(gl.DEPTH_TEST); // new vs. the triangle: nearer faces must hide farther ones
  gl.enable(gl.CULL_FACE); // skip back faces; front faces are counter-clockwise (the default)
}

// Step 6. Scene: lighting, one directional light, camera.
function setupScene(ff: FF): void {
  ff.enable(LIGHTING);
  ff.setGlobalAmbient([0.2, 0.2, 0.2, 1]); // the FF default, set explicitly to make it visible

  // The light TRAVELS in direction (-1, -1, -0.5): down, left, slightly away from the camera.
  // FF's position (w = 0) points TOWARD the light, so the sign flips: (1, 1, 0.5, 0).
  // Passing the travel direction instead lights the faces that point away from the light.
  ff.setLight(0, { position: [1, 1, 0.5, 0], diffuse: [1, 1, 1, 1] });
  ff.enableLight(0);

  const view = mat4.lookAt(mat4.create(),
                          [0, 2.0, 4],  // posicion (0, 1.5, 4)
                          [0, 1.0, -4.0],    // donde apunta
                          [0, 1, 0]);   // orientacion 
  ff.setViewMatrix(view);

  const projection = mat4.perspective(mat4.create(),
                          Math.PI / 4,                  //apertura de la camara
                          CANVAS_WIDTH / CANVAS_HEIGHT, //aspec ratio
                          0.1,                          //distancia minima visible
                          100);                         //distancia maxima visible
  ff.setProjectionMatrix(projection);
}

// ---------------------------------------------------------------------------
// Game loop. Every frame does three separate phases:
//   1. processInput: read what the user did.
//   2. update(dt): advance the simulation by the elapsed time dt.
//   3. render: draw the current state.
// Keep the phases apart: render never changes the state, and update never calls WebGL.
// ---------------------------------------------------------------------------

// Game state: everything the simulation needs, nothing about WebGL.
const state = { angle: 0, colorIndex: 0, rotating: true };

// Input: the keydown listener only records presses. processInput handles them later, once per frame.
let spacePressed = false;
let rPressed = false;

function setupInput(): void {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault(); // stops the page from scrolling
    if (e.repeat) return; // holding a key counts as one press
    if (e.code === 'Space') spacePressed = true;
    if (e.code === 'KeyR') rPressed = true;
  });
  // Research: key-state polling with edge detection. Store which keys are down, and compare with
  // the last frame: pressed = down now && !down last frame. When does it fit better than events?
}

// Loop phase 1. Space selects the next color. R toggles the rotation.
// Each flag is cleared after use, so each press counts once.
//
function processInput(): void {
  if (spacePressed) state.colorIndex = (state.colorIndex + 1) % COLORS.length;
  if (rPressed) state.rotating = !state.rotating;
  spacePressed = false;
  rPressed = false;
}

// Loop phase 2. 
function update(dt: number): void {
  if (state.rotating) state.angle += ROTATION_SPEED * dt; // paused: the angle keeps its value
}

// Loop phase 3. Draw the current state. render reads the state and never changes it.
// setMaterial runs every frame, so FF re-uploads the material each frame. That costs a few
// uniforms and keeps render simple. Exercise: set the material only when colorIndex changes.
const model = mat4.create();
const normalMatrix = mat3.create();

function render(
    gl: WebGL2RenderingContext,
    ff: FF,
    cubeVao: WebGLVertexArrayObject,
    tableVao: WebGLVertexArrayObject,
    cylinderVao: WebGLVertexArrayObject,
    cylinderIndexCount: number,
    sphereVao: WebGLVertexArrayObject,
    sphereVao2: WebGLVertexArrayObject,
    sphereVao3: WebGLVertexArrayObject,
    sphereIndexCount: number,
  ): void {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //Suelo 
  ff.setMaterial({ ambient: FLOOR_AMBIENT, diffuse: FLOOR_COLOR });
  mat4.identity(model);
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(tableVao);
  ff.drawElements(gl.TRIANGLES, TABLE_INDEX.length, gl.UNSIGNED_SHORT, 0);

  //Cubo
  const color: [number, number, number, number] = [0.2, 0.2, 0.2, 1];
  ff.setMaterial({ ambient: color, diffuse: color }); // specular stays at the FF default (0)
  mat4.fromYRotation(model, state.angle);
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(cubeVao);
  ff.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

  //Cilindro
  const colorCilinder: [number, number, number, number] = [0.2, 0.2, 0.2, 1];
  ff.setMaterial({ ambient: colorCilinder, diffuse: colorCilinder });
  mat4.identity(model);
  mat4.translate(model, model, [0, 1.05, 0]);   // al lado del cubo
  mat4.rotateX(model, model, 50);      // gira como el cubo para verse
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(cylinderVao);
  ff.drawElements(gl.TRIANGLES, cylinderIndexCount, gl.UNSIGNED_SHORT, 0);

  // ─── Esfera (temporal, verificación) ───
  const colorSphere: [number, number, number, number] = [0.2, 0.2, 0.2, 1];
  ff.setMaterial({ ambient: colorSphere, diffuse: colorSphere });
  mat4.identity(model);
  mat4.translate(model, model, [0, 0.52, 0]);  // al otro lado del cubo
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(sphereVao);
  ff.drawElements(gl.TRIANGLES, sphereIndexCount, gl.UNSIGNED_SHORT, 0);

  // ─── Esfera 2 ───
  ff.setMaterial({ ambient: [0.35, 0.15, 0.10, 1], diffuse: [0.85, 0.35, 0.20, 1] });
  mat4.identity(model);
  mat4.translate(model, model, [-1.5, 1.55, -3]);  // al otro lado del cubo
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(sphereVao2);
  ff.drawElements(gl.TRIANGLES, sphereIndexCount, gl.UNSIGNED_SHORT, 0);

  // ─── Esfera 3 ───
  ff.setMaterial({ ambient: [0.35, 0.15, 0.10, 1], diffuse: [0.85, 0.35, 0.20, 1] });
  mat4.identity(model);
  mat4.translate(model, model, [-1.5, 2, -3]);  // al otro lado del cubo
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(sphereVao3);
  ff.drawElements(gl.TRIANGLES, sphereIndexCount, gl.UNSIGNED_SHORT, 0);

  // ─── Esfera 4 ───
  ff.setMaterial({ ambient: [0.35, 0.15, 0.10, 1], diffuse: [0.85, 0.35, 0.20, 1] });
  mat4.identity(model);
  mat4.translate(model, model, [2.5, 2, -4]);  // al otro lado del cubo
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(sphereVao3);
  ff.drawElements(gl.TRIANGLES, sphereIndexCount, gl.UNSIGNED_SHORT, 0);  
}

function run(canvas: HTMLCanvasElement): void {
  const gl = getContext(canvas);
  const ff = createFixedFunction(gl, { debug: true });
  //Cubo
  const cubeData    = createBox(1, 1, 1);
  const cubeVBuffer = createVertexBuffer(gl, cubeData.vertices);
  const cubeIBuffer = createIndexBuffer(gl, cubeData.indices);
  const cubeVao     = createVAO(gl, cubeVBuffer, cubeIBuffer);
  //Cilindro
  const cylinderData    = createCylinder(0.065, 0.5, 15);
  const cylinderVBuffer = createVertexBuffer(gl, cylinderData.vertices);
  const cylinderIBuffer = createIndexBuffer(gl, cylinderData.indices);
  const cylinderVao     = createVAO(gl, cylinderVBuffer, cylinderIBuffer);
  //Esfera
  const sphereData    = createSphere(0.35, 24, 32);
  const sphereVBuffer = createVertexBuffer(gl, sphereData.vertices);
  const sphereIBuffer = createIndexBuffer(gl, sphereData.indices);
  const sphereVao     = createVAO(gl, sphereVBuffer, sphereIBuffer);

  //Esfera2
  const sphereData2    = createSphere(0.50, 24, 32);
  const sphereVBuffer2 = createVertexBuffer(gl, sphereData2.vertices);
  const sphereIBuffer2 = createIndexBuffer(gl, sphereData2.indices);
  const sphereVao2     = createVAO(gl, sphereVBuffer2, sphereIBuffer2);

  //Esfera3
  const sphereData3    = createSphere(0.50, 24, 32);
  const sphereVBuffer3 = createVertexBuffer(gl, sphereData3.vertices);
  const sphereIBuffer3 = createIndexBuffer(gl, sphereData3.indices);
  const sphereVao3     = createVAO(gl, sphereVBuffer3, sphereIBuffer3);  

  //Mesa
  const tableVerterx = createVertexBuffer(gl, TABLE);
  const tableIndex  = createIndexBuffer(gl, TABLE_INDEX);
  const tableVao = createVAO(gl, tableVerterx, tableIndex);

  setupState(gl, canvas);
  setupScene(ff);
  setupInput();

  state.colorIndex = 2;
  let last: number | null = null; // set by the first frame, so dt starts at 0
  function frame(now: number): void {
    if (last === null) last = now;
    // rAF pauses in hidden tabs. On return, (now - last) would be huge, so cap dt.
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    processInput();
    update(dt);
    render(
    gl, ff,
    cubeVao, tableVao,
    cylinderVao, cylinderData.indices.length,
    sphereVao, sphereVao2, sphereVao3,  sphereData.indices.length,
  );
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Page scaffolding: create the canvas and start the cube.
const canvas = document.createElement('canvas');
document.getElementById('stage')!.append(canvas);
run(canvas);