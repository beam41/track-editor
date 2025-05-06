import type { Waypoint } from 'src/index.types';
import { getQuaternionRad } from './getQuaternion';
import { getAverageRotation } from './getAvarageRotation';
import { getNormalizedRotation } from './getNormalizedRotation';
import { orientation2D } from './vectors';

export function getNormalizedWaypoints(waypoints: Waypoint[]): Waypoint[] {
  return waypoints.map((wp, i) => {
    let yaw = 2 * Math.atan2(wp.rotation.z, wp.rotation.w);
    const numWaypoints = waypoints.length;
    const prevWaypointIdx = (i - 1 + numWaypoints) % numWaypoints;
    const nextWaypointIdx = (i + 1 + numWaypoints) % numWaypoints;
    const nextWaypointAngle = orientation2D(waypoints[i].translation, waypoints[nextWaypointIdx].translation);

    const averageRotation = getAverageRotation(waypoints[prevWaypointIdx], waypoints[i], waypoints[nextWaypointIdx]);

    const yawPrime = yaw + -Math.sign(yaw) * Math.PI;

    const primeDiffToAvg = Math.abs(getNormalizedRotation(yawPrime - averageRotation));
    const currDiffToAvg = Math.abs(getNormalizedRotation(yaw - averageRotation));
    const primeDiffToNextWp = Math.abs(getNormalizedRotation(yawPrime - nextWaypointAngle));

    if (primeDiffToAvg < currDiffToAvg || primeDiffToNextWp < currDiffToAvg) {
      yaw = yawPrime;
    }

    return {
      translation: wp.translation,
      scale3D: wp.scale3D,
      rotation: getQuaternionRad(yaw),
    };
  });
}
