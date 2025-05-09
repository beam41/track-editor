import type { TrackData } from 'src/index.types';

const vector3Keys = ['x', 'y', 'z'] as const;
const quaternionKeys = ['x', 'y', 'z', 'w'] as const;

export function validateRouteData(data: unknown): data is TrackData {
  const tData = data as TrackData;
  if (!tData || typeof tData !== 'object') {
    alert('Data must be a non-null object.');
    return false;
  }

  if (tData.routeName != null && typeof tData.routeName !== 'string') {
    alert('routeName must be a string.');
    return false;
  }

  if (!Array.isArray(tData.waypoints)) {
    alert('waypoints must be an array.');
    return false;
  }

  for (let i = 0; i < tData.waypoints.length; i++) {
    const waypoint = tData.waypoints[i];

    if (!waypoint || typeof waypoint !== 'object') {
      alert(`Waypoint at index ${i} must be a non-null object.`);
      return false;
    }

    // Validate rotation
    if (!waypoint.rotation || typeof waypoint.rotation !== 'object') {
      alert(`Waypoint at index ${i} is missing rotation data.`);
      return false;
    }

    for (const key of quaternionKeys) {
      if (typeof waypoint.rotation[key] !== 'number') {
        alert(`Waypoint at index ${i} rotation.${key} must be a number.`);
        return false;
      }
    }

    // Validate translation
    if (!waypoint.translation || typeof waypoint.translation !== 'object') {
      alert(`Waypoint at index ${i} is missing translation data.`);
      return false;
    }

    for (const key of vector3Keys) {
      if (typeof waypoint.translation[key] !== 'number') {
        alert(`Waypoint at index ${i} translation.${key} must be a number.`);
        return false;
      }
    }

    // Validate scale3D
    if (!waypoint.scale3D || typeof waypoint.scale3D !== 'object') {
      alert(`Waypoint at index ${i} is missing scale3D data.`);
      return false;
    }
    for (const key of vector3Keys) {
      if (typeof waypoint.scale3D[key] !== 'number') {
        alert(`Waypoint at index ${i} scale3D.${key} must be a number.`);
        return false;
      }
    }
  }

  return true;
}
