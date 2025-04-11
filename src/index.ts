import { init3DPreview } from './components/3d';
import { initEvent as initLoadTrackEvent } from './components/loadTrack';
import { initEvent as initMapEvent } from './components/map';
import { initEvent as initEditorEvent } from './components/editor';
import { initEvent as initDownloadEvent } from './components/download';

initLoadTrackEvent();
initMapEvent();
initEditorEvent();
initDownloadEvent();
init3DPreview();
