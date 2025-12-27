import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const container = document.getElementById('canvasWrap');
const showAllBtn = document.getElementById('showAll');

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
container.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();

// Panorama
const textureLoader = new THREE.TextureLoader();
textureLoader.load('./textures/panaroma.jpg', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
});

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
camera.position.set(0, 1.6, 5);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 1.5));

const pointLight = new THREE.PointLight(0xffffff, 2, 30);
pointLight.position.set(0, 10, 0);
pointLight.castShadow = true;
scene.add(pointLight);

const helper = new THREE.PointLightHelper(pointLight, 0.2);
scene.add(helper);

scene.add(new THREE.DirectionalLight(0xffffff, 3));

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x769568, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Tooltip
const tooltip = document.createElement("div");
tooltip.className = "hotspot-tooltip";
tooltip.style.display = "none";
container.appendChild(tooltip);

// Hotspot descriptions
const hotspotInfo = {
  "Hana": "Хана — Нугалж эвхэгддэг, торлог бүтэцтэй модон хийц.",
  "Haalga": "Хаалга — Гэрийн орц, гарцын үндсэн хэсэг.",
  "Bagana": "Багана — Тооно болон гэрийг тулж барих босоо мод.",
  "Toono": "Тооно — Гэрийн орой дээрх дугуй модон хийц.",
  "Uni": "Унь — Тооно ба ханыг холбож дээврийн бүтэц үүсгэнэ.",
  "Esgii": "Эсгий — Дулаалга, салхи борооноос хамгаална.",
  "Burees": "Бүрээс — Гадна бүрхүүл, хамгаалалт.",
  "Urh": "Өрх — Тооныг бүтээж гэрлийн оролтыг тохируулна.",
  "Uya": "Уяа — Гэрийг бүхэлд нь бэхлэх уяанууд.",
  "shal": "Шал — Гэрийн суурь модон хэсэг."
};

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ============================
//     ГЭРИЙН ХЭСГҮҮД АЧААЛАХ
// ============================

const parts = [
  { id: 'Hana', file: 'models/hana.glb' },
  { id: 'Haalga', file: 'models/haalga_o.glb' },
  { id: 'Toono', file: 'models/toono.glb' },
  { id: 'Bagana', file: 'models/bagana.glb' },
  { id: 'Uni', file: 'models/uni.glb' },
  { id: 'Esgii', file: 'models/esgii.glb' },
  { id: 'Burees', file: 'models/burees.glb' },
  { id: 'Urh', file: 'models/urh.glb' },
  { id: 'Uya', file: 'models/uya.glb' },
  { id: 'shal', file: 'models/shal.glb' }
];

const loadedParts = {};
const gerGroup = new THREE.Group();
scene.add(gerGroup);

const loader = new GLTFLoader();

parts.forEach(part => {
  loader.load(part.file, (gltf) => {
    const mesh = gltf.scene;
    mesh.name = part.id;

    mesh.traverse(c => {
      if (c.isMesh) {
        c.material.side = THREE.DoubleSide;
        c.name = part.id;
      }
    });

    gerGroup.add(mesh);
    loadedParts[part.id] = mesh;

    if (Object.keys(loadedParts).length === parts.length) {
      fitCameraToObject(gerGroup, 1.25);
    }
  });
});

// Fit camera
function fitCameraToObject(object, offset = 1.25) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());
  const distance = size * offset;

  camera.position.copy(center);
  camera.position.z += distance / 2;
  camera.position.y += distance / 5;

  controls.target.copy(center);
}

// ===========================
//    🔥 ШИНЭ ФУНКЦ → ЗӨВХӨН НЭГ ХЭСЭГ ХАРУУЛАХ
// ===========================

function showOnlyPart(id) {
  Object.keys(loadedParts).forEach(key => {
    loadedParts[key].visible = (key === id);
  });

  fitCameraToObject(loadedParts[id], 1.5);
}

// ===========================
//      ХЭСЭГ ДЭЭР ДАРАХАД TOOLTIP
// ===========================

container.addEventListener("click", (event) => {
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(gerGroup.children, true);

  tooltip.classList.remove("show");

  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const info = hotspotInfo[obj.name];
    if (!info) return;

    const worldPos = new THREE.Vector3();
    worldPos.copy(intersects[0].point);

    worldPos.project(camera);

    const screenX = (worldPos.x * 0.5 + 0.6) * rect.width;
    const screenY = (-worldPos.y * 0.5 + 0.8) * rect.height;

    tooltip.innerHTML = info;
    tooltip.style.left = `${screenX}px`;
    tooltip.style.top = `${screenY}px`;

    tooltip.style.display = "block";
    setTimeout(() => tooltip.classList.add("show"), 10);

  } else {
    tooltip.classList.remove("show");
    setTimeout(() => (tooltip.style.display = "none"), 300);
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// Show all
showAllBtn.addEventListener('click', () => {
  Object.values(loadedParts).forEach(p => p.visible = true);
  fitCameraToObject(gerGroup, 1.25);
});

// ===========================
//   Гэрийн бүрэлдэхүүн GRID
// ===========================

const partsGrid = document.getElementById('partsGrid');
const showPartsBtn = document.getElementById('showParts');

function toHumanName(id) {
  const names = {
    "Hana": "Хана",
    "Haalga": "Хаалга",
    "Bagana": "Багана",
    "Toono": "Тооно",
    "Uni": "Унь",
    "Esgii": "Эсгий",
    "Burees": "Бүрээс",
    "Urh": "Өрх",
    "Uya": "Уяа",
    "shal": "Шал"
  };
  return names[id] || id;
}

function renderPartsGrid() {
  partsGrid.innerHTML = "";
  parts.forEach(part => {
    const item = document.createElement("div");
    item.className = "part-item";
    item.textContent = toHumanName(part.id);

    item.addEventListener("click", () => {
      showOnlyPart(part.id);
    });

    partsGrid.appendChild(item);
  });
}

showPartsBtn.addEventListener("click", () => {
  if (partsGrid.style.display === "none" || partsGrid.style.display === "") {
    renderPartsGrid();
    partsGrid.style.display = "grid";
    partsGrid.scrollIntoView({ behavior: "smooth" });
  } else {
    partsGrid.style.display = "none";
  }
});

// Animate loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ---------------- LEFT SIDEBAR COLLAPSE SYSTEM ----------------

// ЗӨВ selector-ууд
const leftCol = document.querySelector(".left-col");
const collapseBtn = document.getElementById("collapseBtn");
const miniOpenBtn = document.getElementById("miniOpenBtn");

// ХААХ — COLLAPSE
collapseBtn.addEventListener("click", () => {
    leftCol.classList.add("collapsed");
    miniOpenBtn.style.display = "block";
});

// НЭЭХ — MINI BUTTON
miniOpenBtn.addEventListener("click", () => {
    leftCol.classList.remove("collapsed");
    miniOpenBtn.style.display = "none";
});