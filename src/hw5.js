// import * as THREE from 'three';
import { OrbitControls } from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// *** FIX 1a: Set renderer's output encoding for correct PBR color rendering ***
// This is critical for the ball's MeshStandardMaterial to look correct.
// However, it requires non-PBR materials' colors to be converted to linear space.
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Optional, but often improves PBR look
renderer.toneMappingExposure = 1.2; // Adjust if the scene becomes too dark/bright after tone mapping

// *** FIX 1b: Convert scene background color to linear if needed ***
// If 0x000000 (black) was already black, converting won't change much.
scene.background = new THREE.Color(0x000000).convertSRGBToLinear(); 

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
directionalLight.castShadow = true;
scene.add(directionalLight);
renderer.shadowMap.enabled = true;

// Court builder
function createBasketballCourt() {
  // Court base (30 x 15 = 2:1 ratio)
  // *** FIX 1c: Convert MeshPhongMaterial colors to linear ***
  const courtGeometry = new THREE.BoxGeometry(30, 0.2, 15);
  const courtMaterial = new THREE.MeshPhongMaterial({ 
    color: new THREE.Color(0xc68642).convertSRGBToLinear(), // Convert court color
    shininess: 50 
  });
  const court = new THREE.Mesh(courtGeometry, courtMaterial);
  court.receiveShadow = true;
  scene.add(court);

  // Line material (white lines)
  // *** FIX 1c: Convert LineBasicMaterial colors to linear ***
  const lineMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(0xffffff).convertSRGBToLinear() });

  // Center Line
  const centerLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.11, -7.5),
    new THREE.Vector3(0, 0.11, 7.5)
  ]);
  const centerLine = new THREE.Line(centerLineGeometry, lineMaterial);
  scene.add(centerLine);

  // Center Circle
  const centerCircleRadius = 1.8;
  const centerCircleSegments = 64;
  const centerCirclePath = new THREE.Path();
  centerCirclePath.absarc(0, 0, centerCircleRadius, 0, Math.PI * 2, false);
  const centerCirclePoints = centerCirclePath.getPoints(centerCircleSegments);
  const centerCircleGeometry = new THREE.BufferGeometry().setFromPoints(
    centerCirclePoints.map(p => new THREE.Vector3(p.x, 0.11, p.y))
  );
  const centerCircle = new THREE.LineLoop(centerCircleGeometry, lineMaterial);
  scene.add(centerCircle);

  // Full Three-point lines (arc + 2 side lines)
function createThreePointLine(xOffset) {
  const radius = 6.75;
  const sideOffset = 4.7;
  const yHeight = 0.201;

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const direction = -1 * Math.sign(xOffset);
  const angle = Math.acos(sideOffset / radius);

  // Arc: flipped horizontally
  const arcCurve = new THREE.EllipseCurve(
    -xOffset, 0,
    radius, radius,
    direction < 0 ? -angle : Math.PI - angle,
    direction < 0 ? angle : Math.PI + angle,
    false
  );
  const arcPoints = arcCurve.getPoints(64).map(p => new THREE.Vector3(p.x, yHeight, p.y));
  const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
  scene.add(new THREE.Line(arcGeometry, lineMaterial));

  // Side lines
  const sideZ1 = -sideOffset;
  const sideZ2 = sideOffset;
  const arcX =  xOffset + direction * radius * Math.cos(angle);

  const leftSide = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(xOffset, yHeight, sideZ1),
    new THREE.Vector3(arcX, yHeight, sideZ1)
  ]);
  scene.add(new THREE.Line(leftSide, lineMaterial));

  const rightSide = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(arcX, yHeight, sideZ2),
    new THREE.Vector3(xOffset, yHeight, sideZ2)
  ]);
  scene.add(new THREE.Line(rightSide, lineMaterial));
}


  createThreePointLine(-15); // Left
  createThreePointLine(15);  // Right
}

// Build court
createBasketballCourt();

function createHoop(xOffset) {
  const yHeight = 3.05; // 10 feet
  const backboardWidth = 1.8;
  const backboardHeight = 1.05;
  const backboardThickness = 0.05;

  const rimRadius = 0.45;
  const rimThickness = 0.05;
  const netLength = 0.5;

  const direction = -1 * Math.sign(xOffset); // -1 for left, +1 for right

 // *** FIX 1c: Convert LineBasicMaterial and MeshPhongMaterial colors to linear ***
 const lineMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(0xffffff).convertSRGBToLinear() });
 const netMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(0xffffff).convertSRGBToLinear() });
 const supportMaterial = new THREE.MeshPhongMaterial({ color: new THREE.Color(0x888888).convertSRGBToLinear() });

  //
  // SUPPORT POLE (now on courtside)
  //
  const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4);
  const pole = new THREE.Mesh(poleGeometry, supportMaterial);
  pole.position.set(xOffset, 2, 0);
  scene.add(pole);

  //
  // SUPPORT ARM (same length and direction as before)
  //
  const rimOffset = (backboardThickness / 2) + (rimThickness / 2) + 0.02;
  const armLength = 0.4; // fixed value preserving 1/3 previous arm length
  const armEndX = pole.position.x + direction * armLength;

  const armStart = new THREE.Vector3(pole.position.x, yHeight + 0.5, 0);
  const armEnd = new THREE.Vector3(armEndX, yHeight, 0);
  const armGeo = new THREE.BufferGeometry().setFromPoints([armStart, armEnd]);
  scene.add(new THREE.Line(armGeo, lineMaterial));

  //
  // BACKBOARD
  //
  const backboardGeometry = new THREE.BoxGeometry(backboardWidth, backboardHeight, backboardThickness);
  const backboardMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6
  });
  const backboard = new THREE.Mesh(backboardGeometry, backboardMaterial);
  backboard.rotation.y = -direction * Math.PI / 2;
  backboard.position.set(armEndX, yHeight, 0);
  scene.add(backboard);

  //
  // RIM
  //
  const rimGeometry = new THREE.TorusGeometry(rimRadius, rimThickness, 16, 100);
  const rimMaterial = new THREE.MeshPhongMaterial({ color: 0xff8c00 });
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(armEndX + direction * rimOffset * 7, yHeight - 0.15, 0);
  scene.add(rim);

  //
  // NET (8 segments)
  //
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x1 = rim.position.x + Math.cos(angle) * rimRadius;
    const z1 = rim.position.z + Math.sin(angle) * rimRadius;
    const netGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, rim.position.y, z1),
      new THREE.Vector3(x1, rim.position.y - netLength, z1)
    ]);
    scene.add(new THREE.Line(netGeo, netMaterial));
  }
}



createHoop(-15); // Left hoop
createHoop(15);  // Right hoop

// Camera
const cameraTranslate = new THREE.Matrix4().makeTranslation(0, 15, 30);
camera.applyMatrix4(cameraTranslate);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// UI instructions
const instructionsElement = document.createElement('div');
instructionsElement.style.position = 'absolute';
instructionsElement.style.bottom = '20px';
instructionsElement.style.left = '20px';
instructionsElement.style.color = 'white';
instructionsElement.style.fontSize = '16px';
instructionsElement.style.fontFamily = 'Arial, sans-serif';
instructionsElement.innerHTML = `
  <h3>Controls:</h3>
  <p>O - Toggle orbit camera</p>
`;
document.body.appendChild(instructionsElement);

// Keyboard toggle
document.addEventListener('keydown', (e) => {
  if (e.key === "o") {
    isOrbitEnabled = !isOrbitEnabled;
  }
});

// Define the base path to your texture folder relative to your JS file
const TEXTURE_PATH = '/src/basketball-classic-ball/Tex_Metal_Rough/';

// 1. Load the textures
const textureLoader = new THREE.TextureLoader();

// Load the specific texture files you listed
const colorMap = textureLoader.load(TEXTURE_PATH + 'basketballball_bball_Mat_BaseColor.jpg',
    // *** FIX 2a: Add onLoad callback for debugging ***
    () => { console.log('BaseColor texture loaded successfully!'); },
    undefined, // onProgress callback (not needed for this fix)
    (error) => { console.error('Error loading BaseColor texture:', error); } // onError callback
);
// *** FIX 2b: Set the color space for the base color map ***
colorMap.colorSpace = THREE.SRGBColorSpace; // This is essential for the PBR texture's color to show correctly

const normalMap = textureLoader.load(TEXTURE_PATH + 'basketballball_bball_Mat_Normal.jpg',
    () => { console.log('Normal texture loaded successfully!'); },
    undefined,
    (error) => { console.error('Error loading Normal texture:', error); }
);
const roughnessMap = textureLoader.load(TEXTURE_PATH + 'basketballball_bball_Mat_Roughness.jpg',
    () => { console.log('Roughness texture loaded successfully!'); },
    undefined,
    (error) => { console.error('Error loading Roughness texture:', error); }
);

const ballRadius = 0.123;
// Increased segments for a smoother spherical appearance with the detailed textures
const ballGeometry = new THREE.SphereGeometry(ballRadius, 64, 64);

// 2. Create a MeshStandardMaterial (for PBR)
const ballMaterial = new THREE.MeshStandardMaterial({
    map: colorMap,          // Apply the base color texture (this includes the orange and black seams)
    normalMap: normalMap,    // Apply the normal map for realistic surface bumps and seam depth
    roughnessMap: roughnessMap, // Apply the roughness map for surface shininess/dullness variations
    // metalnessMap: metallicMap, // Uncomment if you decide to use the metallic map for subtle effects
    metalness: 0.0,         // Basketballs are not metallic, so set this to 0
    // You can fine-tune roughness here if the map doesn't provide enough or you want a base level:
    // roughness: 0.8, // This value will blend with the roughnessMap
});

const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.castShadow = true; // Essential if you plan to have lights cast shadows

// Your current position setting, kept as requested
ball.position.set(0, ballRadius + 0.1, 0); // On court

// Add the ball to your scene (assuming 'scene' is defined elsewhere in your code)
scene.add(ball);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.enabled = isOrbitEnabled;
  controls.update();
  renderer.render(scene, camera);
}

animate();
