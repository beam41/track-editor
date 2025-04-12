export function scaled(x: number) {
  return x * window.devicePixelRatio;
}

export function invertScaled(x: number) {
  return x / window.devicePixelRatio;
}
