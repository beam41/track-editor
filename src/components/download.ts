import { clipboardBtn, downloadBtn } from 'src/element.generated';
import { global } from 'src/global';

function getTrackData() {
  return JSON.stringify(global.trackData, null, 4);
}

export function initEvent() {
  downloadBtn.addEventListener(
    'click',
    () => {
      if (!global.trackData) return;
      const dataStr = getTrackData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'track_updated.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    {
      passive: true,
    },
  );

  clipboardBtn.addEventListener(
    'click',
    () => {
      if (!global.trackData) return;
      const dataStr = getTrackData();
      navigator.clipboard.writeText(dataStr);
    },
    {
      passive: true,
    },
  );
}
