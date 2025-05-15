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
  deleteBtn,
  deleteConfirmModal,
  deleteCancelBtn,
  deleteConfirmBtn,
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

    scaleYInput.value = wp.scale3D.y.toString();
    scaleZInput.value = wp.scale3D.z.toString();

    posXInput.value = (wp.translation.x / 100).toString();
    posYInput.value = (wp.translation.y / 100).toString();
    posZInput.value = (wp.translation.z / 100).toString();
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
      // eslint-disable-next-line no-self-assign
      scaleYInput.value = scaleYInput.value;
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
      const wp = global.trackData.waypoints[global.selectedIndex];

      // rotation
      const q = getQuaternion(parseFloat(rotationInput.value));
      wp.rotation = q;

      // scale
      wp.scale3D.y = parseFloat(scaleYInput.value);
      wp.scale3D.z = parseFloat(scaleZInput.value);

      // position
      wp.translation.x = parseFloat(posXInput.value) * 100;
      wp.translation.y = parseFloat(posYInput.value) * 100;
      wp.translation.z = parseFloat(posZInput.value) * 100;

      updateEditorPanel();
      mapCanvasEl.setPoints(getPoints(global.trackData.waypoints));
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

  deleteBtn.addEventListener('click', () => {
    if (global.trackData && global.selectedIndex !== null) {
      deleteConfirmModal.style.display = 'block';
    }
  });

  deleteCancelBtn.addEventListener('click', () => {
    deleteConfirmModal.style.display = 'none';
  });

  deleteConfirmBtn.addEventListener('click', () => {
    if (global.trackData && global.selectedIndex !== null) {
      global.trackData.waypoints = [
        ...global.trackData.waypoints.slice(0, global.selectedIndex),
        ...global.trackData.waypoints.slice(global.selectedIndex + 1),
      ];
      mapCanvasEl.setPoints(getPoints(global.trackData.waypoints), true);
    }

    deleteConfirmModal.style.display = 'none';
  });
}
