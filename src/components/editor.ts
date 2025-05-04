import {
  selectedInfo,
  rotationInput,
  rotationRangeInput,
  waypointDetails,
  applyRotationBtn,
} from 'src/element.generated';
import { global } from 'src/global';
import { getQuaternion } from 'src/utils/getQuaternion';
import { updatePreview3D } from './3d';
import { mapCanvasEl } from './map';

/* ========= Editor Panel and JSON Load/Export ========= */
export function updateEditorPanel() {
  if (global.selectedIndex === null || !global.trackData || !global.trackData.waypoints[global.selectedIndex]) {
    selectedInfo.innerText = 'No waypoint selected';
    rotationInput.value = '0.00';
    rotationRangeInput.value = '0.00';
    waypointDetails.innerText = '';
  } else {
    selectedInfo.innerText = 'Selected waypoint index: ' + global.selectedIndex;
    const wp = global.trackData.waypoints[global.selectedIndex];
    const yaw = 2 * Math.atan2(wp.rotation.z, wp.rotation.w);
    const yawDeg = ((yaw * 180) / Math.PI).toFixed(2);
    rotationInput.value = yawDeg;
    rotationRangeInput.value = yawDeg;
    waypointDetails.innerText = JSON.stringify(wp.rotation, null, 4);
  }
}

export function initEvent() {
  rotationInput.addEventListener(
    'input',
    () => {
      rotationRangeInput.value = rotationInput.value;
      const q = getQuaternion(parseFloat(rotationInput.value));
      if (!q) {
        return;
      }
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
      if (!q) {
        return;
      }
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
      if (!q) {
        return;
      }
      global.trackData.waypoints[global.selectedIndex].rotation = q;
      updateEditorPanel();
      mapCanvasEl.setPoint(
        global.trackData.waypoints.map((wp) => ({
          position: wp.translation,
          rotation: wp.rotation,
        })),
      );

      updatePreview3D();
      mapCanvasEl.drawMap();
    },
    {
      passive: true,
    },
  );
}
