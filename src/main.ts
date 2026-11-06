// Rotating cube, FixedFunction (FF) version.
import './style.css';
import { mat3, mat4 } from 'gl-matrix';
import { ATTRIB, createFixedFunction, LIGHTING } from './vendor/ff/ff';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CLEAR_COLOR,
  TABLE,
  TABLE_INDEX,
  FLOOR_COLOR,
  FLOOR_AMBIENT,
  NORMAL_OFFSET_BYTES,
  STRIDE_BYTES,
  BODY_HEIGHT, TURRET_RADIUS, CANNON_RADIUS, CANNON_LENGTH, BULLET_RADIUS,  
  TURRET_AMBIENT, TURRET_COLOR ,CANNON_AMBIENT, CANNON_COLOR, BULLET_AMBIENT, BULLET_COLOR, INITIAL_ELEVATION, BODY_DEPTH,
  BAR_WIDTH,BAR_HEIGHT, BAR_DEPTH, BAR_SPACING, BAR_OFF_AMBIENT, BAR_OFF_COLOR, BAR_ON_AMBIENT, BAR_ON_COLOR, FORCE_MULTIPLIERS,
  X_MIN, X_MAX, MIN_ELEVATION, MAX_ELEVATION, HORIZONTAL_SPEED, ELEVATION_SPEED, BASE_SPEED, GRAVITY

} from './constants';
import { createBox } from './geometry/box';
import { createCylinder } from './geometry/cylinder';
import { createSphere } from './geometry/sphere';

type FF = ReturnType<typeof createFixedFunction>;

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
const state = {
  x: 0,
  elev: INITIAL_ELEVATION,
  force: 1,                        
  bullet: {
    status: 'ready' as 'ready' | 'flying',
    pos: [0, 0, 0] as [number, number, number],
    vel: [0, 0, 0] as [number, number, number],
  },
};

// Audio importante
const FAH = new Audio('/src/FAH.m4a');

// keydown marca true. keyup marca false.
// update() lee estos flags cada frame y mueve. No movemos en el evento.
const keys = {
  left:  false,
  right: false,
  up:    false,
  down:  false,
};

let spacePressed = false;
let rPressed     = false;
let forceKey = 0;

function setupInput(): void {
  window.addEventListener('keydown', (e) => {
    // Evita que las flechas hagan scroll en la pagina
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();

    if (e.repeat) return;

    if (e.code === 'ArrowLeft' || e.code === 'KeyA')  keys.left  = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW')    keys.up    = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS')  keys.down  = true;
    if (e.code === 'Space')    spacePressed = true;
    if (e.code === 'KeyR')     rPressed     = true;
    if (e.code === 'Digit1') forceKey = 1;
    if (e.code === 'Digit2') forceKey = 2;
    if (e.code === 'Digit3') forceKey = 3;
    if (e.code === 'KeyF')   forceKey = 4;
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA')  keys.left  = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW')    keys.up    = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS')  keys.down  = false;
  });
}

function processInput(): void {
  // Cambio de fuerza 
  if (forceKey === 4) {
    state.force = (state.force % 3) + 1;   // 1 -> 2 -> 3 -> 1
  } else if (forceKey >= 1 && forceKey <= 3) {
    state.force = forceKey;
  }
  forceKey = 0; // consumir flag

  // Disparar 
  if (spacePressed && state.bullet.status === 'ready') {
    state.bullet.status = 'flying';

    const L = CANNON_LENGTH;
    state.bullet.pos = [
      state.x,
      BODY_HEIGHT + L * Math.sin(state.elev),
      -L * Math.cos(state.elev),
    ];

    const speed = BASE_SPEED * FORCE_MULTIPLIERS[state.force - 1];
    state.bullet.vel = [
      0,
      speed * Math.sin(state.elev),
      -speed * Math.cos(state.elev),
    ];
  }

  // Reiniciar 
  if (rPressed) {
    state.bullet.status = 'ready';
    state.bullet.pos = [0, 0, 0];       
    state.x = 0;
    state.elev = INITIAL_ELEVATION;

    // Reaparece las 3 esferas
    for (const obj of objectives) {
      obj.alive = true;
    }

    // Reinicia la fuerza
    forceKey = 1;
  }

  // Consumir flags
  spacePressed = false;
  rPressed     = false;
}


function update(dt: number): void {
  // Movimiento horizontal 
  let dx = 0;
  if (keys.left)  dx -= 1;
  if (keys.right) dx += 1;
  state.x += dx * HORIZONTAL_SPEED * dt;

    // Fisica del proyectil 
  if (state.bullet.status === 'flying') {
    // Gravedad 
    state.bullet.vel[1] -= GRAVITY * dt;

    // Integrar posicion
    state.bullet.pos[0] += state.bullet.vel[0] * dt;
    state.bullet.pos[1] += state.bullet.vel[1] * dt;
    state.bullet.pos[2] += state.bullet.vel[2] * dt;

    // Colisiones con esferas
    for (const obj of objectives) {
      if (!obj.alive) continue; // Si la esfera ya no existe, se ignora este bucle

      const dx = state.bullet.pos[0] - obj.pos[0];
      const dy = state.bullet.pos[1] - obj.pos[1];
      const dz = state.bullet.pos[2] - obj.pos[2];
      const distSq = dx * dx + dy * dy + dz * dz;

      // Radio de la bala + Radio del objetivo (0.5, según creaste el targetData)
      const collisionDist = BULLET_RADIUS + 0.5;

      if (distSq <= collisionDist * collisionDist) {
        obj.alive = false;             // Desaparece el objetivo
        state.bullet.status = 'ready'; // La bala desaparece / vuelve al cañón
        break;                         // Salimos del bucle porque la bala ya impactó
      }
    }    

    // La bala toca el suelo
    if (state.bullet.pos[1] <= BULLET_RADIUS) {
      state.bullet.pos[1] = BULLET_RADIUS; 
      state.bullet.status = 'ready';
      
      // Se reproduce el audio importante para recordarle al jugador
      // su carencia de habilidad y falta de manos
      FAH.play().catch(e => console.log("Audio bloqueado por el navegador:", e));
    }
  }

  // no se sale de los limites
  if (state.x < X_MIN) state.x = X_MIN;
  if (state.x > X_MAX) state.x = X_MAX;

  // Elevacion
  let de = 0;
  if (keys.up)   de += 1;
  if (keys.down) de -= 1;
  state.elev += de * ELEVATION_SPEED * dt;

  // limite entre 5° y 90°
  if (state.elev < MIN_ELEVATION) state.elev = MIN_ELEVATION;
  if (state.elev > MAX_ELEVATION) state.elev = MAX_ELEVATION;
}

// Loop phase 3. Draw the current state. render reads the state and never changes it.
// setMaterial runs every frame, so FF re-uploads the material each frame. That costs a few
// uniforms and keeps render simple. Exercise: set the material only when colorIndex changes.
const model = mat4.create();
const normalMatrix = mat3.create();

// Coordenadas de las esferas/objetivos.
const objectives = [
  { pos: [-2.0, 1.9, -8.0] as const, alive: true },
  { pos: [ 0.5, 3.7, -15.5] as const, alive: true },
  { pos: [ 2.5, 1.3, -4.5] as const, alive: true },
];

function render(
  gl: WebGL2RenderingContext,
  ff: FF,
  tableVao: WebGLVertexArrayObject,
  bodyVao: WebGLVertexArrayObject,
  barVao: WebGLVertexArrayObject,
  turretVao: WebGLVertexArrayObject, turretIndexCount: number,
  cannonVao: WebGLVertexArrayObject, cannonIndexCount: number,
  bulletVao: WebGLVertexArrayObject, bulletIndexCount: number,
  targetVao: WebGLVertexArrayObject, targetIndexCount: number,
): void {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Suelo 
  ff.setMaterial({ ambient: FLOOR_AMBIENT, diffuse: FLOOR_COLOR });
  mat4.identity(model);
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(tableVao);
  ff.drawElements(gl.TRIANGLES, TABLE_INDEX.length, gl.UNSIGNED_SHORT, 0);

  // Cuerpo (cubo) 
  ff.setMaterial({ ambient: TURRET_AMBIENT, diffuse: TURRET_COLOR });
  mat4.identity(model);
  mat4.translate(model, model, [state.x, BODY_HEIGHT / 2, 0]);
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(bodyVao);
  ff.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

  // Torreta (esfera hundida a la mitad)
  ff.setMaterial({ ambient: TURRET_AMBIENT, diffuse: TURRET_COLOR });
  mat4.identity(model);
  mat4.translate(model, model, [state.x, BODY_HEIGHT, 0]); 
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(turretVao);
  ff.drawElements(gl.TRIANGLES, turretIndexCount, gl.UNSIGNED_SHORT, 0);

  // Cañon (sale del centro de la esfera)
  ff.setMaterial({ ambient: CANNON_AMBIENT, diffuse: CANNON_COLOR });
  mat4.identity(model);
  mat4.translate(model, model, [state.x, BODY_HEIGHT, 0]); 
  mat4.rotateX(model, model, state.elev - Math.PI / 2);
  mat4.translate(model, model, [0, CANNON_LENGTH / 2, 0]);
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(cannonVao);
  ff.drawElements(gl.TRIANGLES, cannonIndexCount, gl.UNSIGNED_SHORT, 0);

  // Indicador de fuerza (3 barras en el cuerpo)
  for (let i = 0; i < 3; i++) {
    const isOn = i < state.force; // nivel 1 enciende i=0, nivel 2 enciende i=0,1...
    
    ff.setMaterial({
      ambient: isOn ? BAR_ON_AMBIENT : BAR_OFF_AMBIENT,
      diffuse: isOn ? BAR_ON_COLOR   : BAR_OFF_COLOR,
    });

    // Desplazamiento vertical para apilarlas (i=0 abajo, i=1 medio, i=2 arriba)
    const yOffset = (i - 1) * (BAR_HEIGHT + BAR_SPACING);

    mat4.identity(model);
    //  Posicion X del tanque, Altura del centro del cubo + offset, Cara trasera del cubo (+Z)
    mat4.translate(model, model, [
      state.x, 
      BODY_HEIGHT / 2 + yOffset, 
      (BODY_DEPTH / 2) + (BAR_DEPTH / 2) // Empujamos hacia la cara que ve la camara
    ]);
    
    ff.setModelMatrix(model);
    ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
    gl.bindVertexArray(barVao);
    ff.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  }

  // Bala (boca del cañon) 
  ff.setMaterial({ ambient: BULLET_AMBIENT, diffuse: BULLET_COLOR });
  mat4.identity(model);
  if (state.bullet.status === 'ready') {
    // Pegada a la boca del cañon 
    mat4.translate(model, model, [state.x, BODY_HEIGHT, 0]);
    mat4.rotateX(model, model, state.elev - Math.PI / 2);
    mat4.translate(model, model, [0, CANNON_LENGTH, 0]);
  } else {
    // Independiente en el mundo 
    mat4.translate(model, model, state.bullet.pos);
  }
  ff.setModelMatrix(model);
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
  gl.bindVertexArray(bulletVao);
  ff.drawElements(gl.TRIANGLES, bulletIndexCount, gl.UNSIGNED_SHORT, 0);

  // Objetivos 
  ff.setMaterial({ ambient: [0.35, 0.15, 0.10, 1], diffuse: [0.85, 0.35, 0.20, 1] });
  for (const obj of objectives) {
    if (!obj.alive) continue;
    mat4.identity(model);
    mat4.translate(model, model, obj.pos);
    ff.setModelMatrix(model);
    ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));
    gl.bindVertexArray(targetVao);
    ff.drawElements(gl.TRIANGLES, targetIndexCount, gl.UNSIGNED_SHORT, 0);
  }
}

function run(canvas: HTMLCanvasElement): void {
  const gl = getContext(canvas);
  const ff = createFixedFunction(gl, { debug: true });
  // Cuerpo (cubo)
  const bodyData    = createBox(1.0, BODY_HEIGHT, 0.8); 
  const bodyVBuffer = createVertexBuffer(gl, bodyData.vertices);
  const bodyIBuffer = createIndexBuffer(gl, bodyData.indices);
  const bodyVao     = createVAO(gl, bodyVBuffer, bodyIBuffer);

  // Torreta (esfera)
  const turretData    = createSphere(TURRET_RADIUS, 24, 32);
  const turretVBuffer = createVertexBuffer(gl, turretData.vertices);
  const turretIBuffer = createIndexBuffer(gl, turretData.indices);
  const turretVao     = createVAO(gl, turretVBuffer, turretIBuffer);

  // Cañon (cilindro abierto)
  const cannonData    = createCylinder(CANNON_RADIUS, CANNON_LENGTH, 15);
  const cannonVBuffer = createVertexBuffer(gl, cannonData.vertices);
  const cannonIBuffer = createIndexBuffer(gl, cannonData.indices);
  const cannonVao     = createVAO(gl, cannonVBuffer, cannonIBuffer);

  // Barras de fuerza (caja pequeña reutilizada 3 veces)
  const barData    = createBox(BAR_WIDTH, BAR_HEIGHT, BAR_DEPTH);
  const barVBuffer = createVertexBuffer(gl, barData.vertices);
  const barIBuffer = createIndexBuffer(gl, barData.indices);
  const barVao     = createVAO(gl, barVBuffer, barIBuffer);


  // Bala (esfera negra, mas gorda que el cañon)
  const bulletData    = createSphere(BULLET_RADIUS, 16, 24);
  const bulletVBuffer = createVertexBuffer(gl, bulletData.vertices);
  const bulletIBuffer = createIndexBuffer(gl, bulletData.indices);
  const bulletVao     = createVAO(gl, bulletVBuffer, bulletIBuffer);

  // Objetivos (una sola esfera reutilizada 3 veces)
  const targetData    = createSphere(0.5, 24, 32);
  const targetVBuffer = createVertexBuffer(gl, targetData.vertices);
  const targetIBuffer = createIndexBuffer(gl, targetData.indices);
  const targetVao     = createVAO(gl, targetVBuffer, targetIBuffer);

  // Suelo
  const tableVertices = createVertexBuffer(gl, TABLE);
  const tableIndices  = createIndexBuffer(gl, TABLE_INDEX);
  const tableVao      = createVAO(gl, tableVertices, tableIndices);

  setupState(gl, canvas);
  setupScene(ff);
  setupInput();

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
    tableVao,
    bodyVao,
    barVao,
    turretVao, turretData.indices.length,
    cannonVao, cannonData.indices.length,
    bulletVao, bulletData.indices.length,
    targetVao, targetData.indices.length,
  );
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Page scaffolding: create the canvas and start the cube.
const canvas = document.createElement('canvas');
document.getElementById('stage')!.append(canvas);
run(canvas);