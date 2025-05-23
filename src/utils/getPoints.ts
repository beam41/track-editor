import type { PointsGroups } from 'mt-map/dist/map';
import type { Waypoint } from 'src/index.types';

export function getPoints(waypoints: Waypoint[]): PointsGroups {
  return {
    track: {
      points: waypoints.map((wp) => ({
        position: wp.translation,
        yaw: 2 * Math.atan2(wp.rotation.z, wp.rotation.w),
        scaleY: wp.scale3D.y,
      })),
      trackMode: true,
      draggable: true,
      color: {
        point: '#3949AB',
        hover: '#9FA8DA',
        selected: '#FB8C00',
      },
    },
  };
}
