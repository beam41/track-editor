import { mapCanvas } from '../element.generated';
import { global } from '../global';
import { transformPoint } from './homography';
import { scaled } from '../utils/scaled';
import { updatePreview3D } from './3d';
import { updateEditorPanel } from './editor';

// For the map view:
const mapCanvasCtx = mapCanvas.getContext('2d');
mapCanvas.width = scaled(1000);
mapCanvas.height = scaled(1000);
mapCanvas.style.width = '1000px';
mapCanvas.style.height = '1000px';

let currentScale = 1,
  offsetX = 0,
  offsetY = 0;
let isDragging = false,
  lastX = 0,
  lastY = 0;

/* ========= Map Drawing Functions ========= */
const mapImage = new Image();
mapImage.onload = function () {
  fitMapToReference();
};
// Ensure this points to your actual map image.
mapImage.src = 'map.png';

function fitMapToReference() {
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

export function drawMap() {
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

  if (global.trackData && global.trackData.waypoints) {
    const markerScale = getMarkerScale();
    // Compute transformed points for each waypoint.
    const mapPoints = global.trackData.waypoints.map((wp) => {
      const worldPt = { x: wp.translation.x, y: wp.translation.y };
      return transformPoint(worldPt);
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
    global.trackData.waypoints.forEach((wp, index) => {
      const mp = mapPoints[index];
      // Draw checkpoint circle.
      mapCanvasCtx.beginPath();
      mapCanvasCtx.arc(mp.x, mp.y, baseCheckpointRadius * markerScale, 0, 2 * Math.PI);
      mapCanvasCtx.fillStyle = index === global.selectedIndex ? 'orange' : 'blue';
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
export function initEvent() {
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
    offsetX += scaled(dx);
    offsetY += scaled(dy);
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
    const clickX = (scaled(e.clientX) - scaled(rect.left) - offsetX) / currentScale;
    const clickY = (scaled(e.clientY) - scaled(rect.top) - offsetY) / currentScale;
    let minDist = Infinity;
    let nearestIndex = null;
    if (global.trackData && global.trackData.waypoints) {
      const mapPoints = global.trackData.waypoints.map((wp) =>
        transformPoint({ x: wp.translation.x, y: wp.translation.y }),
      );
      mapPoints.forEach((pt, index) => {
        const dist = Math.hypot(clickX - pt.x, clickY - pt.y);
        if (dist < minDist) {
          minDist = dist;
          nearestIndex = index;
        }
      });
      if (minDist < 10) {
        global.selectedIndex = nearestIndex;
        updateEditorPanel();
        drawMap();
        updatePreview3D();
      }
    }
  });
}
