import { mapCanvas } from '../element.generated';
import { global } from '../global';
import { updatePreview3D } from './3d';
import { updateEditorPanel } from './editor';
import type { MotorTownMap } from '../../mt-map/dist/map';

export const mapCanvasEl = mapCanvas as MotorTownMap;

/* ========= Panning and Zooming for the Map ========= */
export function initEvent() {
  mapCanvasEl.addEventListener('mt-map:point-click', (e) => {
    global.selectedIndex = e.detail.index;
    updateEditorPanel();
    updatePreview3D();
  });
}
