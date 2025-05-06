import {
  selectedInfo,
  rotationInput,
  rotationRangeInput,
  applyRotationBtn,
  autoRotationBtn,
} from 'src/element.generated';
import { global } from 'src/global';
import { getQuaternion, getQuaternionRad } from 'src/utils/getQuaternion';
import { updatePreview3D } from './3d';
import { mapCanvasEl } from './map';
import { getPoints } from 'src/utils/getPoints';
import { getAverageRotation } from 'src/utils/getAvarageRotation';

/* ========= Editor Panel and JSON Load/Export ========= */
export function updateEditorPanel() {
  if (global.selectedIndex === null || !global.trackData || !global.trackData.waypoints[global.selectedIndex]) {
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
  }
}

export function initEvent() {
  rotationInput.addEventListener(
    'input',
    () => {
      rotationRangeInput.value = rotationInput.value;
      const q = getQuaternion(parseFloat(rotationInput.value));
      updatePreview3D(q);
    },
    {
      passive: true,
    },
  );
  rotationRangeInput.addEventListener(
    'input',
    () => {
      rotationInput.value = (+rotationRangeInput.value).toFixed(2);
      const q = getQuaternion(parseFloat(rotationInput.value));
      updatePreview3D(q);
    },
    {
      passive: true,
    },
  );

  applyRotationBtn.addEventListener(
    'click',
    function () {
      if (global.selectedIndex === null || !global.trackData || !global.trackData.waypoints[global.selectedIndex]) {
        alert('No waypoint selected.');
        return;
      }
      const q = getQuaternion(parseFloat(rotationInput.value));
      global.trackData.waypoints[global.selectedIndex].rotation = q;
      updateEditorPanel();
      mapCanvasEl.setPoint(getPoints(global.trackData.waypoints));

      updatePreview3D();
    },
    {
      passive: true,
    },
  );

  autoRotationBtn.addEventListener(
    'click',
    function () {
      if (global.selectedIndex === null || !global.trackData || !global.trackData.waypoints[global.selectedIndex]) {
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
      mapCanvasEl.setPoint(getPoints(global.trackData.waypoints));

      updatePreview3D();
    },
    {
      passive: true,
    },
  );
}
