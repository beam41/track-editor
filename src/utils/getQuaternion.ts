export function getQuaternion(degYaw: number) {
  if (isNaN(degYaw)) {
    alert('Please enter a valid number.');
    return;
  }
  const newYaw = (degYaw * Math.PI) / 180;
  return {
    x: 0,
    y: 0,
    z: Math.sin(newYaw / 2),
    w: Math.cos(newYaw / 2),
  };
}
