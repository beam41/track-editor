import { fileInput, trackJson, loadTrackBtn, downloadBtn, clipboardBtn } from 'src/element.generated';
import { global } from 'src/global';
import { drawMap } from './map';

export function initEvent() {
  fileInput.addEventListener('input', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          JSON.parse(e.target?.result as string);
          trackJson.value = e.target?.result as string;
        } catch (e) {
          console.error('fileInput input failed:', e);
          alert('Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    }
  });

  loadTrackBtn.addEventListener('click', function () {
    const text = trackJson.value;
    try {
      global.trackData = JSON.parse(text);
      afterLoadTrack();
    } catch (e) {
      console.error('loadTrackBtn click failed:', e);
      alert('Invalid JSON text.');
    }
  });
}

function afterLoadTrack() {
  global.selectedIndex = null;
  drawMap();
  downloadBtn.disabled = false;
  clipboardBtn.disabled = false;
}
