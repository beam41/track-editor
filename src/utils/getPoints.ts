import type { Point } from 'mt-map/dist/map';
import type { Waypoint } from 'src/index.types';

export function getPoints(waypoints: Waypoint[]): Point[] {
  return waypoints.map((wp) => ({
    position: wp.translation,
    yaw: 2 * Math.atan2(wp.rotation.z, wp.rotation.w),
  }));
}
