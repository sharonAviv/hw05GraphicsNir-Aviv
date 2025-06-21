import { OrbitControls } from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0x000000);

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
  const courtGeometry = new THREE.BoxGeometry(30, 0.2, 15);
  const courtMaterial = new THREE.MeshPhongMaterial({ color: 0xc68642, shininess: 50 });
  const court = new THREE.Mesh(courtGeometry, courtMaterial);
  court.receiveShadow = true;
  scene.add(court);

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

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

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const netMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const supportMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });

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

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.enabled = isOrbitEnabled;
  controls.update();
  renderer.render(scene, camera);
}

animate();
