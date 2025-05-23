import type { Waypoint } from 'src/index.types';
import { orientation2D } from './vectors';
import { getNormalizedRotation } from './getNormalizedRotation';

export function getAverageRotation(prevWaypoint: Waypoint, currWaypoint: Waypoint, nextWaypoint: Waypoint) {
  const angleAB = orientation2D(prevWaypoint.translation, currWaypoint.translation);
  const angleBC = orientation2D(currWaypoint.translation, nextWaypoint.translation);
  let averageRotation = (angleAB + angleBC) / 2;

  const avgPrime = averageRotation + -Math.sign(averageRotation) * Math.PI;

  if (
    Math.abs(getNormalizedRotation(avgPrime - angleBC)) < Math.abs(getNormalizedRotation(averageRotation - angleBC))
  ) {
    averageRotation = avgPrime;
  }

  return averageRotation;
}
