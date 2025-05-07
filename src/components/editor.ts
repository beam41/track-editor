import {
  selectedInfo,
  rotationInput,
  rotationRangeInput,
  autoRotationBtn,
  scaleYInput,
  scaleZInput,
  posXInput,
  posYInput,
  posZInput,
  applyBtn,
} from 'src/element.generated';
import { global } from 'src/global';
import { getQuaternion, getQuaternionRad } from 'src/utils/getQuaternion';
import { mapCanvasEl } from './map';
import { getPoints } from 'src/utils/getPoints';
import { getAverageRotation } from 'src/utils/getAvarageRotation';
import { toRad } from 'src/utils/vectors';

/* ========= Editor Panel and JSON Load/Export ========= */
export function updateEditorPanel() {
  if (global.selectedIndex === null || !global.trackData?.waypoints[global.selectedIndex]) {
    selectedInfo.innerText = 'No waypoint selected';
    rotationInput.value = '0.00';
    rotationRangeInput.value = '0.00';
  } else {
    selectedInfo.innerText = 'Selected waypoint index: ' + global.selectedIndex;
    const wp = global.trackData.waypoints[global.selectedIndex];
    const yaw = 2 * Math.atan2(wp.rotation.z, wp.rotation.w);
    const yawDeg = ((yaw * 180) / Math.PI).toFixed(2);
    rotationInput.value = yawDeg;
    rotationRangeInput.value = yawDeg;

    scaleYInput.value = global.trackData.waypoints[global.selectedIndex].scale3D.y.toString();
    scaleZInput.value = global.trackData.waypoints[global.selectedIndex].scale3D.z.toString();

    posXInput.value = (global.trackData.waypoints[global.selectedIndex].translation.x / 100).toString();
    posYInput.value = (global.trackData.waypoints[global.selectedIndex].translation.y / 100).toString();
    posZInput.value = (global.trackData.waypoints[global.selectedIndex].translation.z / 100).toString();
  }
}

export function initEvent() {
  rotationInput.addEventListener(
    'input',
    () => {
      rotationRangeInput.value = rotationInput.value;
      mapCanvasEl.setSelectedPointYaw(toRad(+rotationInput.value));
    },
    {
      passive: true,
    },
  );
  rotationRangeInput.addEventListener(
    'input',
    () => {
      rotationInput.value = (+rotationRangeInput.value).toFixed(2);
      mapCanvasEl.setSelectedPointYaw(toRad(+rotationInput.value));
    },
    {
      passive: true,
    },
  );

  scaleYInput.addEventListener(
    'input',
    () => {
      mapCanvasEl.setSelectedPointsScaleY(+scaleYInput.value);
    },
    {
      passive: true,
    },
  );

  autoRotationBtn.addEventListener(
    'click',
    () => {
      if (global.selectedIndex === null || !global.trackData?.waypoints[global.selectedIndex]) {
        alert('No waypoint selected.');
        return;
      }
      const numWaypoints = global.trackData.waypoints.length;
      const prevWaypointIdx = (global.selectedIndex - 1 + numWaypoints) % numWaypoints;
      const nextWaypointIdx = (global.selectedIndex + 1 + numWaypoints) % numWaypoints;

      const averageRotation = getAverageRotation(
        global.trackData.waypoints[prevWaypointIdx],
        global.trackData.waypoints[global.selectedIndex],
        global.trackData.waypoints[nextWaypointIdx],
      );

      const q = getQuaternionRad(averageRotation);
      global.trackData.waypoints[global.selectedIndex].rotation = q;
      updateEditorPanel();
      mapCanvasEl.setPoints(getPoints(global.trackData.waypoints));
    },
    {
      passive: true,
    },
  );

  applyBtn.addEventListener(
    'click',
    () => {
      if (global.selectedIndex === null || !global.trackData?.waypoints[global.selectedIndex]) {
        alert('No waypoint selected.');
        return;
      }
      // rotation
      const q = getQuaternion(parseFloat(rotationInput.value));
      global.trackData.waypoints[global.selectedIndex].rotation = q;
      updateEditorPanel();
      mapCanvasEl.setPoints(getPoints(global.trackData.waypoints));

      // scale
      global.trackData.waypoints[global.selectedIndex].scale3D.y = parseFloat(scaleYInput.value);
      global.trackData.waypoints[global.selectedIndex].scale3D.z = parseFloat(scaleZInput.value);

      // position
      global.trackData.waypoints[global.selectedIndex].translation.x = parseFloat(posXInput.value) * 100;
      global.trackData.waypoints[global.selectedIndex].translation.y = parseFloat(posYInput.value) * 100;
      global.trackData.waypoints[global.selectedIndex].translation.z = parseFloat(posZInput.value) * 100;
    },
    {
      passive: true,
    },
  );

  const posChange = () => {
    mapCanvasEl.setSelectedPointsPosition({
      x: +posXInput.value * 100,
      y: +posYInput.value * 100,
    });
  };

  posXInput.addEventListener('input', posChange);
  posYInput.addEventListener('input', posChange);
}
