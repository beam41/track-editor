import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  mapCanvas,
  selectedInfo,
  rotationInput,
  waypointDetails,
  applyRotationBtn,
  loadTrackBtn,
  fileInput,
  trackJson,
  downloadBtn,
  preview3D,
} from './element';
import type { Matrix3x3, TrackData, Vector2 } from './index.types';

const H_DEFAULT = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
] as Matrix3x3;

/* ========= Global Variables ========= */
let trackData: TrackData | null = null;
let selectedIndex: number | null = null;

// For the map view:
const mapCanvasCtx = mapCanvas.getContext('2d');
let currentScale = 1,
  offsetX = 0,
  offsetY = 0;
let isDragging = false,
  lastX = 0,
  lastY = 0;

// --- Reference Points for Map Alignment ---
// Using your provided four corners (clockwise from top left)
const referenceWorldPoints = [
  { x: -1277708.2965454245, y: -317662.26182056009 }, // top-left
  { x: 917131.48374835111, y: -315379.30946399376 }, // top-right
  { x: 917957.0844781138, y: 1877914.3470450507 }, // bottom-right
  { x: -1279574.7736519347, y: 1879092.599622732 }, // bottom-left
];

// Destination points matching the canvas dimensions (800×800)
const referenceMapPoints = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 1000 },
  { x: 0, y: 1000 },
];

// The homography matrix (3x3) mapping world points to canvas points.
let H = H_DEFAULT as Matrix3x3;

/* ========= Homography Computation ========= */
function solveLinearSystem(A: number[][], b: number[]) {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    A[i].push(b[i]);
  }
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[maxRow][i])) {
        maxRow = j;
      }
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    if (Math.abs(A[i][i]) < 1e-10) {
      throw new Error('Matrix is singular or nearly singular');
    }
    const pivot = A[i][i];
    for (let j = i; j < n + 1; j++) {
      A[i][j] /= pivot;
    }
    for (let j = i + 1; j < n; j++) {
      const factor = A[j][i];
      for (let k = i; k < n + 1; k++) {
        A[j][k] -= factor * A[i][k];
      }
    }
  }
  const x: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = A[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= A[i][j] * x[j];
    }
  }
  return x;
}

function computeHomography(srcPoints: Vector2[], dstPoints: Vector2[]) {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = srcPoints[i];
    const { x: xp, y: yp } = dstPoints[i];
    A.push([x, y, 1, 0, 0, 0, -xp * x, -xp * y]);
    b.push(xp);
    A.push([0, 0, 0, x, y, 1, -yp * x, -yp * y]);
    b.push(yp);
  }
  const h = solveLinearSystem(A, b);
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ] as Matrix3x3;
}

function transformPoint(point: Vector2, H: Matrix3x3) {
  const x = point.x,
    y = point.y;
  const xp = H[0][0] * x + H[0][1] * y + H[0][2];
  const yp = H[1][0] * x + H[1][1] * y + H[1][2];
  const wp = H[2][0] * x + H[2][1] * y + H[2][2];
  return { x: xp / wp, y: yp / wp };
}

/* ========= Map Drawing Functions ========= */
let mapImage: HTMLImageElement | undefined;
function loadMap() {
  mapImage = new Image();
  mapImage.onload = function () {
    fitMapToReference();
  };
  // Ensure this points to your actual map image.
  mapImage.src = 'map.png';
}

function updateHomography() {
  try {
    H = computeHomography(referenceWorldPoints, referenceMapPoints);
  } catch (e) {
    console.error('Homography computation failed:', e);
    H = H_DEFAULT;
  }
}

function fitMapToReference() {
  updateHomography();
  currentScale = 1;
  offsetX = 0;
  offsetY = 0;
  drawMap();
}

// --- Base size control variables (all sizes 10x smaller than the original design) ---
const baseCheckpointRadius = 0.5; // originally 5 → now 0.5
const baseArrowLength = 2; // originally 20 → now 2
const baseArrowHeadLength = 1; // originally 10 → now 1
const baseConnectingLineWidth = 0.2; // originally 2 → now 0.2
const baseArrowLineWidth = 0.2; // originally 2 → now 0.2
const baseLabelFontSize = 0.6; // originally 6px → now 0.6px

// Dynamic marker scale factor based on current overall scale.
function getMarkerScale() {
  // Use 2/currentScale so that markers are larger initially.
  let markerScale = 2 / currentScale;
  markerScale = Math.max(1, Math.min(markerScale, 5));
  return markerScale;
}

function drawMap() {
  if (!mapCanvasCtx) {
    console.log('mapCanvas not found');
    return;
  }
  mapCanvasCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  mapCanvasCtx.save();
  mapCanvasCtx.translate(offsetX, offsetY);
  mapCanvasCtx.scale(currentScale, currentScale);

  // Draw the map image.
  if (mapImage) {
    mapCanvasCtx.drawImage(mapImage, 0, 0, mapCanvas.width, mapCanvas.height);
  }

  if (trackData && trackData.waypoints) {
    const markerScale = getMarkerScale();
    // Compute transformed points for each waypoint.
    const mapPoints = trackData.waypoints.map((wp) => {
      const worldPt = { x: wp.translation.x, y: wp.translation.y };
      return transformPoint(worldPt, H);
    });
    // Draw connecting polyline.
    mapCanvasCtx.beginPath();
    mapPoints.forEach((pt, i) => {
      if (i === 0) {
        mapCanvasCtx.moveTo(pt.x, pt.y);
      } else {
        mapCanvasCtx.lineTo(pt.x, pt.y);
      }
    });
    mapCanvasCtx.strokeStyle = 'white';
    mapCanvasCtx.lineWidth = baseConnectingLineWidth * markerScale;
    mapCanvasCtx.stroke();

    // Draw each waypoint with its arrow and label.
    trackData.waypoints.forEach((wp, index) => {
      const mp = mapPoints[index];
      // Draw checkpoint circle.
      mapCanvasCtx.beginPath();
      mapCanvasCtx.arc(mp.x, mp.y, baseCheckpointRadius * markerScale, 0, 2 * Math.PI);
      mapCanvasCtx.fillStyle = index === selectedIndex ? 'orange' : 'blue';
      mapCanvasCtx.fill();
      mapCanvasCtx.strokeStyle = 'black';
      mapCanvasCtx.lineWidth = 0.1 * markerScale;
      mapCanvasCtx.stroke();
      // Draw waypoint number.
      mapCanvasCtx.fillStyle = 'white';
      const computedFontSize = baseLabelFontSize * markerScale;
      mapCanvasCtx.font = `bold ${computedFontSize}px sans-serif`;
      const text = (index + 1).toString();
      const textMetrics = mapCanvasCtx.measureText(text);
      mapCanvasCtx.fillText(
        text,
        mp.x - textMetrics.width / 2,
        mp.y - baseCheckpointRadius * markerScale - 2 * markerScale,
      );
      // Draw arrow indicating checkpoint facing.
      const yaw = 2 * Math.atan2(wp.rotation.z, wp.rotation.w);
      const dx = baseArrowLength * markerScale * Math.cos(yaw);
      const dy = baseArrowLength * markerScale * Math.sin(yaw);
      mapCanvasCtx.beginPath();
      mapCanvasCtx.moveTo(mp.x, mp.y);
      mapCanvasCtx.lineTo(mp.x + dx, mp.y + dy);
      mapCanvasCtx.strokeStyle = 'red';
      mapCanvasCtx.lineWidth = baseArrowLineWidth * markerScale;
      mapCanvasCtx.stroke();
      drawArrowHead(mapCanvasCtx, mp.x, mp.y, mp.x + dx, mp.y + dy, markerScale);
    });
  }
  mapCanvasCtx.restore();
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  markerScale: number,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - baseArrowHeadLength * markerScale * Math.cos(angle - Math.PI / 6),
    toY - baseArrowHeadLength * markerScale * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - baseArrowHeadLength * markerScale * Math.cos(angle + Math.PI / 6),
    toY - baseArrowHeadLength * markerScale * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fillStyle = 'red';
  ctx.fill();
}

/* ========= Panning and Zooming for the Map ========= */
mapCanvas.addEventListener('wheel', function (e) {
  e.preventDefault();
  const rect = mapCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  const worldX = (mouseX - offsetX) / currentScale;
  const worldY = (mouseY - offsetY) / currentScale;
  currentScale *= zoomFactor;
  offsetX = mouseX - worldX * currentScale;
  offsetY = mouseY - worldY * currentScale;
  drawMap();
});
mapCanvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  mapCanvas.style.cursor = 'grabbing';
  const rect = mapCanvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
});
mapCanvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const rect = mapCanvas.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;
  const dx = currentX - lastX;
  const dy = currentY - lastY;
  offsetX += dx;
  offsetY += dy;
  lastX = currentX;
  lastY = currentY;
  drawMap();
});
mapCanvas.addEventListener('mouseup', () => {
  isDragging = false;
  mapCanvas.style.cursor = 'grab';
});
mapCanvas.addEventListener('mouseleave', () => {
  isDragging = false;
  mapCanvas.style.cursor = 'grab';
});

// Add a "click" listener for waypoint selection.
mapCanvas.addEventListener('click', (e) => {
  // Only proceed if not dragging.
  if (isDragging) return;
  const rect = mapCanvas.getBoundingClientRect();
  // Get click position in the transformed coordinate space.
  const clickX = (e.clientX - rect.left - offsetX) / currentScale;
  const clickY = (e.clientY - rect.top - offsetY) / currentScale;
  let minDist = Infinity;
  let nearestIndex = null;
  if (trackData && trackData.waypoints) {
    const mapPoints = trackData.waypoints.map((wp) => transformPoint({ x: wp.translation.x, y: wp.translation.y }, H));
    mapPoints.forEach((pt, index) => {
      const dist = Math.hypot(clickX - pt.x, clickY - pt.y);
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = index;
      }
    });
    // Use a threshold (adjust if needed) in canvas (transformed) units.
    if (minDist < 10) {
      selectedIndex = nearestIndex;
      updateEditorPanel();
      drawMap();
      updatePreview3D();
    }
  }
});

/* ========= Editor Panel and JSON Load/Export ========= */
function updateEditorPanel() {
  if (selectedIndex === null || !trackData || !trackData.waypoints[selectedIndex]) {
    selectedInfo.innerText = 'No waypoint selected';
    rotationInput.value = '';
    waypointDetails.innerText = '';
  } else {
    selectedInfo.innerText = 'Selected waypoint index: ' + selectedIndex;
    const wp = trackData.waypoints[selectedIndex];
    const yaw = 2 * Math.atan2(wp.rotation.z, wp.rotation.w);
    rotationInput.value = ((yaw * 180) / Math.PI).toFixed(2);
    waypointDetails.innerText = JSON.stringify(wp.rotation, null, 4);
  }
}
applyRotationBtn.addEventListener('click', function () {
  if (selectedIndex === null || !trackData || !trackData.waypoints[selectedIndex]) {
    alert('No waypoint selected.');
    return;
  }
  const newDeg = parseFloat(rotationInput.value);
  if (isNaN(newDeg)) {
    alert('Please enter a valid number.');
    return;
  }
  const newYaw = (newDeg * Math.PI) / 180;
  trackData.waypoints[selectedIndex].rotation = {
    x: 0,
    y: 0,
    z: Math.sin(newYaw / 2),
    w: Math.cos(newYaw / 2),
  };
  updateEditorPanel();
  drawMap();
  updatePreview3D();
});
loadTrackBtn.addEventListener('click', function () {
  if (fileInput.files && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        trackData = JSON.parse(e.target?.result as string);
        afterLoadTrack();
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  } else {
    const text = trackJson.value;
    try {
      trackData = JSON.parse(text);
      afterLoadTrack();
    } catch {
      alert('Invalid JSON text.');
    }
  }
});
function afterLoadTrack() {
  selectedIndex = null;
  updateHomography();
  drawMap();
  downloadBtn.disabled = false;
}
downloadBtn.addEventListener('click', function () {
  if (!trackData) return;
  const dataStr = JSON.stringify(trackData, null, 4);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'track_updated.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/* ========= 3D Preview (Three.js) ========= */
const previewObject = new THREE.Mesh(
  new THREE.BoxGeometry(1.618033988749895 * 10, 10, 1),
  new THREE.MeshStandardMaterial({ color: 0xffff00 }),
);

function init3DPreview() {
  const previewRenderer = new THREE.WebGLRenderer({
    canvas: preview3D,
    antialias: true,
  });
  previewRenderer.setSize(preview3D.width, preview3D.height);
  const previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(0xe8fffb);
  const previewCamera = new THREE.PerspectiveCamera(75, preview3D.width / preview3D.height, 0.1, 1000);
  previewCamera.position.set(10, 10, 10);

  const previewControls = new OrbitControls(previewCamera, preview3D);
  previewControls.update();

  previewScene.add(previewObject);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  previewScene.add(ambientLight);

  function animatePreview() {
    previewRenderer.render(previewScene, previewCamera);
  }
  previewRenderer.setAnimationLoop(animatePreview);
}

function updatePreview3D() {
  if (selectedIndex === null || !trackData || !trackData.waypoints[selectedIndex]) {
    return;
  }
  const q = trackData.waypoints[selectedIndex].rotation;
  const yaw = 2 * Math.atan2(q.z, q.w);
  previewObject.rotation.set(0, yaw, 0);
}

init3DPreview();
loadMap();
