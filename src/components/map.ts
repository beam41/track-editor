import { mapCanvas } from '../element.generated';
import { global } from '../global';
import { transformPoint, updateHomography } from './homography';
import { scaled } from '../utils/scaled';
import { updatePreview3D } from './3d';
import { updateEditorPanel } from './editor';

// For the map view:
const mapCanvasCtx = mapCanvas.getContext('2d');
const canvasBound = mapCanvas.getBoundingClientRect();
mapCanvas.width = scaled(canvasBound.width);
mapCanvas.height = scaled(canvasBound.height);

let currentScale = 1,
  offsetX = 0,
  offsetY = 0;
let isDragging = false,
  lastX = 0,
  lastY = 0;

/* ========= Map Drawing Functions ========= */
const mapImage = new Image();
let mapLoaded = false;
mapImage.onload = function () {
  mapLoaded = true;
  currentScale = 1;
  offsetX = 0;
  offsetY = 0;
  drawMap();
};
// Ensure this points to your actual map image.
mapImage.src = 'map.png';

// --- Base size control variables (all sizes 10x smaller than the original design) ---
const baseCheckpointRadius = scaled(0.5); // originally 5 → now 0.5
const baseArrowLength = scaled(2); // originally 20 → now 2
const baseArrowHeadLength = scaled(1); // originally 10 → now 1
const baseConnectingLineWidth = scaled(0.2); // originally 2 → now 0.2
const baseArrowLineWidth = scaled(0.2); // originally 2 → now 0.2
const baseLabelFontSize = scaled(0.6); // originally 6px → now 0.6px

// Dynamic marker scale factor based on current overall scale.
function getMarkerScale() {
  // Use 2/currentScale so that markers are larger initially.
  let markerScale = scaled(2 / currentScale);
  markerScale = Math.max(1, Math.min(markerScale, 5));
  return markerScale;
}

export function drawMap() {
  if (!mapCanvasCtx) {
    console.error('mapCanvas not found');
    return;
  }
  mapCanvasCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  mapCanvasCtx.save();
  mapCanvasCtx.translate(offsetX, offsetY);
  mapCanvasCtx.scale(currentScale, currentScale);

  let mapWidth = mapCanvas.width;
  let mapHeight = mapCanvas.height;
  // Draw the map image.
  if (mapImage && mapLoaded) {
    if (mapWidth > mapHeight) {
      mapHeight = mapWidth * (mapImage.height / mapImage.width);
    } else {
      mapWidth = mapHeight * (mapImage.width / mapImage.height);
    }

    mapCanvasCtx.drawImage(mapImage, 0, 0, mapWidth, mapHeight);
  } else if (mapWidth > mapHeight) {
    mapHeight = mapWidth;
  } else {
    mapWidth = mapHeight;
  }
  updateHomography(mapWidth, mapHeight);

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
      // Draw arrow indicating checkpoint facing.
      const yaw = 2 * Math.atan2(wp.rotation.z, wp.rotation.w);
      const dx = baseArrowLength * markerScale * Math.cos(yaw);
      const dy = baseArrowLength * markerScale * Math.sin(yaw);
      const arrowBodyLength = (baseArrowLength * Math.sqrt(3)) / 2;
      const dxBody = arrowBodyLength * markerScale * Math.cos(yaw);
      const dyBody = arrowBodyLength * markerScale * Math.sin(yaw);
      mapCanvasCtx.beginPath();
      mapCanvasCtx.moveTo(mp.x, mp.y);
      mapCanvasCtx.lineTo(mp.x + dxBody, mp.y + dyBody);
      mapCanvasCtx.strokeStyle = 'red';
      mapCanvasCtx.lineWidth = baseArrowLineWidth * markerScale;
      mapCanvasCtx.stroke();
      drawArrowHead(mapCanvasCtx, mp.x, mp.y, mp.x + dx, mp.y + dy, markerScale);

      // Draw checkpoint circle.
      mapCanvasCtx.beginPath();
      mapCanvasCtx.arc(mp.x, mp.y, baseCheckpointRadius * markerScale, 0, 2 * Math.PI);
      mapCanvasCtx.fillStyle = index === global.selectedIndex ? 'orange' : 'blue';
      mapCanvasCtx.fill();
      mapCanvasCtx.strokeStyle = 'black';
      mapCanvasCtx.lineWidth = scaled(0.1 * markerScale);
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
        mp.y - baseCheckpointRadius * markerScale - scaled(0.5) * markerScale,
      );
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

export function zoomFit() {
  if (!mapCanvasCtx) {
    console.error('mapCanvas not found');
    return;
  }

  if (!(global.trackData && global.trackData.waypoints)) {
    console.error('track data waypoints invalid');
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  global.trackData.waypoints
    .map((wp) => transformPoint(wp.translation))
    .forEach((point) => {
      minX = Math.min(point.x, minX);
      minY = Math.min(point.y, minY);
      maxX = Math.max(point.x, maxX);
      maxY = Math.max(point.y, maxY);
    });
  const deltaX = maxX - minX;
  const deltaY = maxY - minY;
  if (deltaX > deltaY) {
    currentScale = (mapCanvas.width - scaled(64)) / deltaX;
    offsetX = -minX * currentScale + scaled(32);
    const midpointY = (minY + maxY) / 2;
    offsetY = -midpointY * currentScale + mapCanvas.height / 2;
  } else {
    currentScale = (mapCanvas.height - scaled(64)) / deltaY;
    offsetY = -minY * currentScale + scaled(32);
    const midpointX = (minX + maxX) / 2;
    offsetX = -midpointX * currentScale + mapCanvas.width / 2;
  }

  drawMap();
}

/* ========= Panning and Zooming for the Map ========= */
export function initEvent() {
  mapCanvas.addEventListener(
    'wheel',
    function (e) {
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
    },
    {
      passive: false,
    },
  );

  mapCanvas.addEventListener(
    'mousedown',
    (e) => {
      isDragging = true;
      mapCanvas.style.cursor = 'grabbing';
      const rect = mapCanvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    },
    {
      passive: true,
    },
  );

  mapCanvas.addEventListener(
    'mousemove',
    (e) => {
      const rect = mapCanvas.getBoundingClientRect();
      if (isDragging) {
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        const dx = currentX - lastX;
        const dy = currentY - lastY;
        offsetX += scaled(dx);
        offsetY += scaled(dy);
        lastX = currentX;
        lastY = currentY;
        drawMap();
      } else {
        const hoverX = (scaled(e.clientX) - scaled(rect.left) - offsetX) / currentScale;
        const hoverY = (scaled(e.clientY) - scaled(rect.top) - offsetY) / currentScale;

        if (!(global.trackData && global.trackData.waypoints)) {
          return;
        }

        const mapPoints = global.trackData.waypoints.map((wp) => transformPoint(wp.translation));

        const hasClosePoint = mapPoints.some((pt, i) => {
          if (i === global.selectedIndex) return false;
          const dist = Math.hypot(hoverX - pt.x, hoverY - pt.y);
          return dist < baseCheckpointRadius + scaled(1);
        });
        if (hasClosePoint) {
          mapCanvas.style.cursor = 'pointer';
        } else {
          mapCanvas.style.cursor = 'grab';
        }
      }
    },
    {
      passive: true,
    },
  );

  mapCanvas.addEventListener(
    'mouseup',
    () => {
      isDragging = false;
      mapCanvas.style.cursor = 'grab';
    },
    {
      passive: true,
    },
  );

  mapCanvas.addEventListener(
    'mouseleave',
    () => {
      isDragging = false;
      mapCanvas.style.cursor = 'grab';
    },
    {
      passive: true,
    },
  );

  // Add a "click" listener for waypoint selection.
  mapCanvas.addEventListener(
    'click',
    (e) => {
      // Only proceed if not dragging.
      if (isDragging) return;
      const rect = mapCanvas.getBoundingClientRect();
      // Get click position in the transformed coordinate space.
      const clickX = (scaled(e.clientX) - scaled(rect.left) - offsetX) / currentScale;
      const clickY = (scaled(e.clientY) - scaled(rect.top) - offsetY) / currentScale;

      if (!(global.trackData && global.trackData.waypoints)) {
        console.error('track data waypoints invalid');
        return;
      }
      const mapPoints = global.trackData.waypoints.map((wp) => transformPoint(wp.translation));

      // easier to select point close together
      const candidatePoints = mapPoints
        .map((pt, index) => ({ pt, i: index }))
        .filter(({ pt }) => {
          const dist = Math.hypot(clickX - pt.x, clickY - pt.y);
          return dist < baseCheckpointRadius + scaled(1);
        });

      if (candidatePoints.length === 0) {
        return;
      }

      const candidateIndex =
        (candidatePoints.findIndex(({ i }) => i === global.selectedIndex) + 1) % candidatePoints.length;

      global.selectedIndex = candidatePoints[candidateIndex].i;
      updateEditorPanel();
      drawMap();
      updatePreview3D();
    },
    {
      passive: true,
    },
  );

  window.addEventListener(
    'resize',
    () => {
      const canvasBound = mapCanvas.getBoundingClientRect();
      mapCanvas.width = scaled(canvasBound.width);
      mapCanvas.height = scaled(canvasBound.height);
      drawMap();
    },
    {
      passive: true,
    },
  );
}
