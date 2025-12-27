import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ====== MENU toggle ======
const toggleBtn = document.getElementById('buildToggle');
const submenu = document.getElementById('buildSubmenu');

toggleBtn.addEventListener('click', () => {
  submenu.classList.toggle("open");
});

// ====== Three.js Scene ======
const scene = new THREE.Scene();

// Background 360°
const textureLoader = new THREE.TextureLoader();
textureLoader.load('./textures/panaroma.jpg', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
});

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth , window.innerHeight );
document.getElementById('canvasWrap').appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 15, 35);
controls.target.set(0, 5, 0);
controls.update();

// 🌤 Lights — дотор ба гадна
const ambient = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambient);

const pointLight = new THREE.PointLight(0xffffff, 5, 30);
pointLight.position.set(0, 10, 0);
pointLight.castShadow = true;
scene.add(pointLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 3);
dirLight.position.set(15, 15, 15);
dirLight.castShadow = true;
scene.add(dirLight);

const helper = new THREE.PointLightHelper(pointLight, 0.2);
scene.add(helper);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x769568, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ====== GLTF Loader ======
const loader = new GLTFLoader();

// ====== Main menu buttons ======
document.querySelectorAll('.menu-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.menu-btn').forEach(b =>
      b.classList.remove('active')
    );
    btn.classList.add('active');

    const subMenu = btn.nextElementSibling;
    if (subMenu && subMenu.classList.contains('sub-menu')) {
      subMenu.classList.toggle('open');
    }

    // pageTitle элемент байхгүй байж магад, тул шалгах
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = btn.textContent;
  });
});

// ====== Model list ======
const parts = [
  { id: 'hana', file: 'models/hana.glb' },
  { id: 'haalga', file: 'models/haalga_o.glb' },
  { id: 'toono', file: 'models/toono.glb' },
  { id: 'bagana', file: 'models/bagana.glb' },
  { id: 'uni', file: 'models/uni.glb' },
  { id: 'esgii', file: 'models/esgii.glb' },
  { id: 'burees', file: 'models/burees.glb' },
  { id: 'urh', file: 'models/urh.glb' },
  { id: 'uya', file: 'models/uya.glb' },
  { id: 'shal', file: 'models/shal.glb' }
];

const loadedParts = {};

// ====== Load model function ======
function loadPart(partId) {
  const part = parts.find(p => p.id === partId);
  if (!part) return;

  // already loaded → сэргээж нүүрэнд нэм
  if (loadedParts[partId]) {
    // хэрвээ өмнө нь scene-с авсан бол дахин нэмнэ
    if (!scene.children.includes(loadedParts[partId])) {
      scene.add(loadedParts[partId]);
    }
    return;
  }

  loader.load(part.file, gltf => {
    const model = gltf.scene;
    model.scale.set(1, 1, 1);
    scene.add(model);
    loadedParts[partId] = model;
  });
}

// ====== Submenu buttons (active persistent) ======
const subBtns = document.querySelectorAll('.sub-btn');

subBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    subBtns.forEach(b => b.classList.remove('active'));
    btn.classList.toggle("active");
    loadPart(btn.dataset.part);
  });
});

// =====================================================
//          ✨ 1. AUTO BUILD (Нэг нэгээр барих) ✨
// =====================================================

// Камерын анхны байрлал
const initialCameraPos = new THREE.Vector3(0, 15, 35)
const initialTarget = new THREE.Vector3(0, 5, 0);


let building = false;

const buildStepBtn = document.getElementById("buildStep");
if (buildStepBtn) {
  buildStepBtn.addEventListener("click", () => {
    if (building) return;
    building = true;

    // бүх хэсгийг сценээс цэвэрлэх (харин кэш-д үлдэнэ)
    Object.keys(loadedParts).forEach(key => {
      if (scene.children.includes(loadedParts[key])) {
        scene.remove(loadedParts[key]);
      }
    });

    let index = 0;

    function buildNext() {
      if (index >= parts.length) {
        building = false;
        return;
      }

      const partId = parts[index].id;
      loadPart(partId);

      index++;
      setTimeout(buildNext, 1200); // 1.2 секунд бүрт дараагийн хэсэг
    }

    buildNext();
  });
}

// =====================================================
//          2. CAMERA RESET (Бүгдийг харуулах)
// =====================================================

const showAll = document.getElementById("showAll");
if (showAll) {
  showAll.addEventListener("click", () => {

    // бүх кэшлэгдсэн хэсгийг сцен руу оруулна (хаа байгаа ч)
    Object.keys(loadedParts).forEach(key => {
      if (!scene.children.includes(loadedParts[key])) {
        scene.add(loadedParts[key]);
      }
    });

    const duration = 600;
    const start = performance.now();

    const camStart = camera.position.clone();
    const targetStart = controls.target.clone();

    function animateCam(time) {
      const t = Math.min((time - start) / duration, 1);

      camera.position.lerpVectors(camStart, initialCameraPos, t);
      controls.target.lerpVectors(targetStart, initialTarget, t);

      controls.update();

      if (t < 1) requestAnimationFrame(animateCam);
    }

    requestAnimationFrame(animateCam);
  });
}

// =====================================================
//          ✨ 3. CLEAR ALL (Бүгдийг арилгах) ✨
// =====================================================

const hideAllBtn = document.getElementById("hideAll");

if (hideAllBtn) {
  hideAllBtn.addEventListener("click", () => {

    // Сцен доторх бүх ачаалсан хэсгийг арилгана (cached байдал хэвээр)
    Object.keys(loadedParts).forEach(key => {
      const obj = loadedParts[key];
      if (obj && scene.children.includes(obj)) {
        scene.remove(obj);
      }
    });

    // Submenu товчнуудын active-г цэвэрлэх
    subBtns.forEach(b => b.classList.remove("active"));

    // Камер бага зэрэг холдоно (optional)
    camera.position.copy(defaultCameraPos);
    controls.target.copy(defaultTarget);
    controls.update();
  });
}
// ====== Animation loop ======
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