import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const parts = [
  { id: 'hana', file: 'models/hana.glb', name:"Хана" },
  { id: 'haalga', file: 'models/haalga_o.glb', name:"Хаалга" },
  { id: 'toono', file: 'models/toono.glb', name:"Тооно" },
  { id: 'bagana', file: 'models/bagana.glb', name:"Багана" },
  { id: 'uni', file: 'models/uni.glb', name:"Унь" },
  { id: 'esgii', file: 'models/esgii.glb', name:"Эсгий" },
  { id: 'burees', file: 'models/burees.glb', name:"Бүрээс" },
  { id: 'urh', file: 'models/urh.glb', name:"Өрх" },
  { id: 'uya', file: 'models/uya.glb', name:"Уяа" },
  { id: 'shal', file: 'models/shal.glb', name:"Шал" }
];

const partList = document.getElementById("componentList");
const mainCanvas = document.getElementById("gameCanvas");

const loader = new GLTFLoader();

//////////////////////////////////////////////////
// 1) PREVIEW
//////////////////////////////////////////////////
function createPreviewCanvas(part) {
    const li = document.createElement("li");
    li.className = "part-item";
    li.draggable = true;
    li.dataset.part = part.id;

    const canvas = document.createElement("canvas");
    li.appendChild(canvas);
    partList.appendChild(li);

    const previewRenderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true
    });
    previewRenderer.setSize(240, 140);

    const scene = new THREE.Scene();
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(10, 10, 10);
    scene.add(light);

    const cam = new THREE.PerspectiveCamera(45, 240 / 140, 0.1, 100);
    cam.position.set(2, 4, 20);

    loader.load(part.file, (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.6, 0.6, 0.6);
        scene.add(model);

        function animate() {
            previewRenderer.render(scene, cam);
            requestAnimationFrame(animate);
        }
        animate();
    });
}
parts.forEach(createPreviewCanvas);

//////////////////////////////////////////////////
// 2) MAIN SCENE
//////////////////////////////////////////////////
const renderer = new THREE.WebGLRenderer({
    canvas: mainCanvas,
    antialias: true
});
renderer.setSize(mainCanvas.clientWidth, mainCanvas.clientHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe6e6e6);

const camera = new THREE.PerspectiveCamera(
    60,
    mainCanvas.clientWidth / mainCanvas.clientHeight,
    0.1,
    1000
);
camera.position.set(0, 20, 50);

const controls = new OrbitControls(camera, mainCanvas);
controls.enableDamping = true;
controls.enableRotate = false; 

// Lighting
const dirLight = new THREE.DirectionalLight(0xffffff, 4);
dirLight.position.set(5, 8, 5);
scene.add(dirLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(3, 4, 2);
scene.add(pointLight);

const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
);
plane.rotation.x = -Math.PI / 2;
plane.userData.isFloor = true;
scene.add(plane);

//////////////////////////////////////////////////
// 3) DRAG → DROP (NEW: drop on mouse position)
//////////////////////////////////////////////////
let draggedPart = null;

partList.addEventListener("dragstart", (e) => {
    const li = e.target.closest("li");
    if (li) draggedPart = li.dataset.part;
});

mainCanvas.addEventListener("dragover", (e) => {
    e.preventDefault();
});

mainCanvas.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!draggedPart) return;

    const rect = mainCanvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    const intersect = raycaster.intersectObject(plane);

    if (intersect.length > 0) {
        const pos = intersect[0].point;
        const info = parts.find(p => p.id === draggedPart);
        spawnModelAt(info.file, pos);
    }

    draggedPart = null;
});

//////////////////////////////////////////////////
// 4) Spawn at mouse position (NEW)
//////////////////////////////////////////////////
function spawnModelAt(file, position) {
    loader.load(file, (gltf) => {
        const model = gltf.scene;

        model.position.copy(position);

        
      
        model.rotation.set(0, 0, 0);

        model.userData.isModel = true;
        model.userData.file = file;

        scene.add(model);

        transformControls.detach();
        selectedObject = null;
    });
}

//////////////////////////////////////////////////
// TRANSFORM CONTROLS
//////////////////////////////////////////////////
const transformControls = new TransformControls(camera, renderer.domElement);
scene.add(transformControls);

transformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value;
});

//////////////////////////////////////////////////
// SELECT + DRAG OBJECT WITH MOUSE
//////////////////////////////////////////////////
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let selectedObject = null;
let isDragging = false;
let dragPlane = new THREE.Plane();
let dragOffset = new THREE.Vector3();

mainCanvas.addEventListener("mousedown", (event) => {
    const rect = mainCanvas.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        let obj = intersects[0].object;

        // Дотроос нь хамгийн дээд model хүртэл өгсөх
        while (obj.parent && obj.parent.type !== "Scene") {
            obj = obj.parent;
        }

            if (obj.userData.isModel) {
        selectedObject = obj;
        isDragging = true;

        // drag plane
        dragPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(0, 1, 0),
            selectedObject.position
        );

        const hitPoint = intersects[0].point;
        dragOffset.subVectors(selectedObject.position, hitPoint);

        // ★ TransformControls-г зөвхөн ЭНД attach хийнэ
        transformControls.attach(selectedObject);
    }

    } else {
        // Хоосон газар → сонголтыг цэвэрлэх
        selectedObject = null;
        transformControls.detach();
    }
});



mainCanvas.addEventListener("mousemove", (event) => {
    if (!isDragging || !selectedObject) return;

    const rect = mainCanvas.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Цэгийг хавтгай дээр буулгах
    const pointOnPlane = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, pointOnPlane);

    if (pointOnPlane) {
        const newPos = pointOnPlane.add(dragOffset);

        // Y-г түгжих (өөрчлөгдөхгүй)
        newPos.y = selectedObject.position.y;

        selectedObject.position.copy(newPos);
    }
});


mainCanvas.addEventListener("mouseup", () => {
    isDragging = false;

    if (selectedObject) {
        // Чирч дуусаад transformControls-оо л ON болгоно
        transformControls.attach(selectedObject);
        
    }
});


/* ------------------------------------------------------------- */
/* 7) ROTATE BUTTON                                              */
/* ------------------------------------------------------------- */
/*const rotateBtn = document.getElementById("rotate");
rotateBtn.addEventListener("click", () => {
  if (!selectedObject) return;

  transformControls.attach(selectedObject);
  transformControls.setMode("rotate");

  transformControls.showX = true;
  transformControls.showZ = true;
  transformControls.showY = true;
// Enable pointer interaction for rotation (TransformControls handles mouse drag)
});

// Shift + snap (15°)
window.addEventListener("keydown", (e) => {
  if (e.key === "Shift") {
    transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
  }
  // Ctrl+Z undo
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    undo();
  }
});
window.addEventListener("keyup", (e) => {
  if (e.key === "Shift") {
    transformControls.setRotationSnap(null);
  }
});*/
/* ------------------------------------------------------------- */
/* 8) DELETE                                                     */
/* ------------------------------------------------------------- */
document.getElementById("delete").addEventListener("click", () => {
  if (!selectedObject) return;

  scene.remove(selectedObject);
  pushUndo();
  transformControls.detach();
  selectedObject = null;
  });

/* ------------------------------------------------------------- */
/* 9) UNDO SYSTEM                                                */
/* ------------------------------------------------------------- */
function pushUndo() {
  const saved = exportState();
  undoStack.push(saved);

  if (undoStack.length > 30) undoStack.shift();
}

function undo() {
  if (undoStack.length < 2) return;

  undoStack.pop(); // remove current
  const prev = undoStack[undoStack.length - 1];

  loadState(prev);
}

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z") undo();
});

/* ------------------------------------------------------------- */
/* 10) SAVE / LOAD                                               */
/* ------------------------------------------------------------- */
function exportState() {
  const data = [];

  scene.children.forEach((c) => {
    if (c.userData.isModel) {
      data.push({
        id: c.userData.id,
        pos: c.position.toArray(),
        rot: c.rotation.toArray(),
      });
    }
  });

  return JSON.stringify(data);
}

function loadState(json) {
  const data = JSON.parse(json);
  scene.children = scene.children.filter((o) => !o.userData.isModel);

  data.forEach((d) => {
    loader.load(PARTS.find((p) => p.id === d.id).file, (gltf) => {
      const m = gltf.scene.clone();
      m.position.fromArray(d.pos);
      m.rotation.fromArray(d.rot);
      m.userData.isModel = true;
      m.userData.id = d.id;
      scene.add(m);
    });
  });
}



/* HIDE ALL */
document.getElementById("hideAll").addEventListener("click", () => {
  scene.children.forEach((c) => {
    if (c.userData.isModel) c.visible = false;
  });
});


//////////////////////////////////////////////////
// Resize
//////////////////////////////////////////////////
window.addEventListener("resize", () => {
    const w = mainCanvas.clientWidth;
    const h = mainCanvas.clientHeight;

    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
});

//////////////////////////////////////////////////
// Animation
//////////////////////////////////////////////////
function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
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
