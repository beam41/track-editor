export function getQuaternion(degYaw: number) {
  const radYaw = (degYaw * Math.PI) / 180;
  return getQuaternionRad(radYaw);
}

export function getQuaternionRad(radYaw: number) {
  if (isNaN(radYaw)) {
    alert('Please enter a valid number.');
    return {
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    };
  }
  return {
    x: 0,
    y: 0,
    z: Math.sin(radYaw / 2),
    w: Math.cos(radYaw / 2),
  };
}
