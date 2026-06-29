import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

const canvas = document.querySelector("#space-scene");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x03040a, 0.025);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 160);
camera.position.set(0, 1.2, 10);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const pointer = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();

const root = new THREE.Group();
scene.add(root);

const ambient = new THREE.AmbientLight(0x7ddfff, 0.8);
scene.add(ambient);

const keyLight = new THREE.PointLight(0xff7aa8, 70, 42);
keyLight.position.set(-7, 5, 7);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x7cf4b0, 44, 36);
rimLight.position.set(7, -3, 2);
scene.add(rimLight);

function makeCircleTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 96;
  textureCanvas.height = 96;
  const context = textureCanvas.getContext("2d");
  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.22, "rgba(210,244,255,0.9)");
  gradient.addColorStop(0.55, "rgba(125,223,255,0.32)");
  gradient.addColorStop(1, "rgba(125,223,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePlanetTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 1024;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext("2d");
  const base = context.createLinearGradient(0, 0, 1024, 512);
  base.addColorStop(0, "#162144");
  base.addColorStop(0.45, "#284d7a");
  base.addColorStop(1, "#11233f");
  context.fillStyle = base;
  context.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 135; i += 1) {
    const y = Math.random() * 512;
    const height = 8 + Math.random() * 42;
    const alpha = 0.05 + Math.random() * 0.18;
    const hue = Math.random() > 0.5 ? "125, 223, 255" : "255, 209, 102";
    context.fillStyle = `rgba(${hue}, ${alpha})`;
    context.beginPath();
    context.ellipse(
      Math.random() * 1024,
      y,
      90 + Math.random() * 260,
      height,
      Math.random() * 0.18 - 0.09,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  for (let i = 0; i < 2200; i += 1) {
    const value = 120 + Math.random() * 95;
    context.fillStyle = `rgba(${value}, ${value + 12}, ${value + 30}, ${Math.random() * 0.06})`;
    context.fillRect(Math.random() * 1024, Math.random() * 512, 1 + Math.random() * 2, 1);
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeAccretionMaterial(innerColor, outerColor, opacity) {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      innerColor: { value: new THREE.Color(innerColor) },
      outerColor: { value: new THREE.Color(outerColor) },
      opacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 innerColor;
      uniform vec3 outerColor;
      uniform float opacity;

      void main() {
        vec2 centered = vUv - 0.5;
        float radius = length(centered) * 2.0;
        float angle = atan(centered.y, centered.x);
        float bands = sin(angle * 10.0 + radius * 18.0) * 0.5 + 0.5;
        float edge = smoothstep(1.0, 0.7, radius) * smoothstep(0.18, 0.34, radius);
        vec3 color = mix(innerColor, outerColor, radius);
        color += bands * 0.22;
        gl_FragColor = vec4(color, edge * opacity);
      }
    `,
  });
}

const starTexture = makeCircleTexture();
const planetTexture = makePlanetTexture();

function makePlanet() {
  const planet = new THREE.Group();
  const geometry = new THREE.SphereGeometry(2.1, 128, 64);
  const material = new THREE.MeshStandardMaterial({
    map: planetTexture,
    roughness: 0.64,
    metalness: 0.04,
    emissive: 0x071326,
    emissiveIntensity: 0.45,
  });
  const mesh = new THREE.Mesh(geometry, material);
  planet.add(mesh);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.24, 128, 64),
    new THREE.MeshBasicMaterial({
      color: 0x7ddfff,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  planet.add(atmosphere);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(2.135, 96, 48),
    new THREE.MeshBasicMaterial({
      map: planetTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  planet.add(clouds);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.68, 3.22, 256),
    new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ring.rotation.x = Math.PI * 0.57;
  ring.rotation.y = Math.PI * 0.08;
  planet.add(ring);

  planet.position.set(3.8, -0.45, -1.4);
  root.add(planet);
  return { planet, mesh, atmosphere, clouds, ring };
}

function makeStars(count, radius, color, size) {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const distance = radius * (0.45 + Math.random() * 0.55);
    positions[i3] = Math.sin(phi) * Math.cos(theta) * distance;
    positions[i3 + 1] = Math.sin(phi) * Math.sin(theta) * distance;
    positions[i3 + 2] = Math.cos(phi) * distance;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    map: starTexture,
    size,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}

function makeOrbit(radius, color, yOffset) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius * 0.36, 0, Math.PI * 2);
  const points = curve.getPoints(220).map((point) => new THREE.Vector3(point.x, yOffset, point.y));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.35,
  });
  const orbit = new THREE.LineLoop(geometry, material);
  orbit.rotation.x = Math.PI * 0.1;
  orbit.rotation.z = Math.PI * 0.06;
  root.add(orbit);
  return orbit;
}

function makeMoon(radius, angle, color, size) {
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(size, 48, 24),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.15,
      emissive: color,
      emissiveIntensity: 0.12,
    }),
  );
  moon.userData = { radius, angle, speed: 0.28 + Math.random() * 0.2 };
  root.add(moon);
  return moon;
}

function makeComet() {
  const comet = new THREE.Group();
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 1.7, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x7ddfff,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.85;
  comet.add(head, tail);
  scene.add(comet);
  return comet;
}

function makeBlackHole() {
  const blackHole = new THREE.Group();

  const shadow = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 64, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  shadow.renderOrder = 4;
  blackHole.add(shadow);

  const eventHorizon = new THREE.Mesh(
    new THREE.SphereGeometry(0.92, 64, 32),
    new THREE.MeshBasicMaterial({
      color: 0x050816,
      transparent: true,
      opacity: 0.84,
    }),
  );
  eventHorizon.renderOrder = 3;
  blackHole.add(eventHorizon);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.94, 1.18, 160),
    new THREE.MeshBasicMaterial({
      color: 0x7ddfff,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  blackHole.add(glow);

  const accretionDisk = new THREE.Mesh(
    new THREE.RingGeometry(1.08, 2.42, 320),
    makeAccretionMaterial(0xffffff, 0xff7a1a, 0.82),
  );
  accretionDisk.rotation.x = Math.PI * 0.62;
  accretionDisk.rotation.y = Math.PI * 0.08;
  blackHole.add(accretionDisk);

  const outerDisk = new THREE.Mesh(
    new THREE.RingGeometry(1.92, 3.18, 320),
    makeAccretionMaterial(0xffd166, 0x7ddfff, 0.36),
  );
  outerDisk.rotation.x = Math.PI * 0.62;
  outerDisk.rotation.y = Math.PI * 0.08;
  blackHole.add(outerDisk);

  const jetGeometry = new THREE.ConeGeometry(0.16, 2.8, 32, 1, true);
  const jetMaterial = new THREE.MeshBasicMaterial({
    color: 0x7ddfff,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const upperJet = new THREE.Mesh(jetGeometry, jetMaterial);
  upperJet.position.y = 1.55;
  const lowerJet = upperJet.clone();
  lowerJet.rotation.z = Math.PI;
  lowerJet.position.y = -1.55;
  blackHole.add(upperJet, lowerJet);

  blackHole.position.set(-4.9, 1.4, -4.2);
  blackHole.scale.setScalar(0.92);
  root.add(blackHole);

  return { blackHole, accretionDisk, outerDisk, glow, upperJet, lowerJet };
}

const planetParts = makePlanet();
const blackHoleParts = makeBlackHole();
const starFieldNear = makeStars(900, 82, 0xffffff, 0.035);
const starFieldFar = makeStars(1500, 130, 0x7ddfff, 0.022);
const orbitOne = makeOrbit(4.7, 0x7ddfff, -0.25);
const orbitTwo = makeOrbit(6.1, 0xff7aa8, 0.1);
const moonOne = makeMoon(4.7, 0.8, 0xffd166, 0.18);
const moonTwo = makeMoon(6.1, 2.8, 0x7cf4b0, 0.12);
const comet = makeComet();

function updateMoon(moon, elapsed) {
  const { radius, angle, speed } = moon.userData;
  const t = angle + elapsed * speed;
  moon.position.set(Math.cos(t) * radius, Math.sin(t * 1.2) * 0.45 - 0.2, Math.sin(t) * radius * 0.36 - 1.1);
}

function handlePointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
}

function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function animate() {
  const elapsed = clock.getElapsedTime();
  const isMobile = window.innerWidth < 820;

  root.rotation.y = elapsed * 0.035 + pointer.x * 0.12;
  root.rotation.x = pointer.y * 0.045;
  root.position.x = isMobile ? 0.2 : -0.9;
  root.position.y = isMobile ? -0.85 : -0.2;

  planetParts.mesh.rotation.y += 0.0028;
  planetParts.mesh.rotation.x = Math.sin(elapsed * 0.25) * 0.04;
  planetParts.atmosphere.rotation.y -= 0.0015;
  planetParts.clouds.rotation.y -= 0.0018;
  planetParts.clouds.rotation.x = Math.sin(elapsed * 0.18) * 0.025;
  planetParts.ring.rotation.z = Math.sin(elapsed * 0.18) * 0.08;

  blackHoleParts.blackHole.rotation.z = Math.sin(elapsed * 0.18) * 0.04;
  blackHoleParts.accretionDisk.rotation.z = elapsed * 0.42;
  blackHoleParts.outerDisk.rotation.z = -elapsed * 0.24;
  blackHoleParts.glow.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.055);
  blackHoleParts.upperJet.scale.y = 1 + Math.sin(elapsed * 1.2) * 0.08;
  blackHoleParts.lowerJet.scale.y = 1 + Math.cos(elapsed * 1.2) * 0.08;

  starFieldNear.rotation.y = elapsed * 0.012;
  starFieldNear.rotation.x = pointer.y * 0.02;
  starFieldFar.rotation.y = -elapsed * 0.006;
  orbitOne.rotation.z = Math.PI * 0.06 + Math.sin(elapsed * 0.18) * 0.04;
  orbitTwo.rotation.z = -Math.PI * 0.03 + Math.cos(elapsed * 0.2) * 0.04;

  updateMoon(moonOne, elapsed);
  updateMoon(moonTwo, elapsed);

  comet.position.set(((elapsed * 1.6) % 18) - 9, 3.4 - ((elapsed * 0.34) % 4), -3.5);
  comet.rotation.z = -0.42;

  camera.position.x += (pointer.x * 0.32 - camera.position.x) * 0.025;
  camera.position.y += (1.2 - pointer.y * 0.2 - camera.position.y) * 0.025;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("resize", handleResize);

animate();
