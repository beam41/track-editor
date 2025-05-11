import { mapCanvas, posXInput, posYInput } from '../element.generated';
import { global } from '../global';
import { updateEditorPanel } from './editor';
import type { MotorTownMap } from '../../mt-map/dist/map';

export const mapCanvasEl = mapCanvas as MotorTownMap;

/* ========= Panning and Zooming for the Map ========= */
export function initEvent() {
  mapCanvasEl.addEventListener('mt-map:point-click', (e) => {
    global.selectedIndex = e.detail.index;
    updateEditorPanel();
  });

  mapCanvasEl.addEventListener('mt-map:point-move', (e) => {
    posXInput.value = (e.detail.position.x / 100).toString();
    posYInput.value = (e.detail.position.y / 100).toString();
  });
}
