import { fileInput, trackJson, loadTrackBtn, downloadBtn, clipboardBtn } from 'src/element.generated';
import { global } from 'src/global';
import { drawMap, zoomFit } from './map';

const PROXY_URL = 'https://www.aseanmotorclub.com/proxy';

function maybeFetchTrackUri(proxy = PROXY_URL) {
  const params = new URLSearchParams(window.location.search);
  const uri = params.get('uri');
  if (!uri) {
    return Promise.resolve(null);
  }
  const proxiedUri = `${proxy}?url=${encodeURIComponent(uri)}`;
  return fetch(proxiedUri)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .catch((error) => {
      console.error('Fetch error:', error);
    });
}

function loadTrack() {
  const text = trackJson.value;
  try {
    global.trackData = JSON.parse(text);
    global.selectedIndex = null;
    drawMap();
    zoomFit();
    downloadBtn.disabled = false;
    clipboardBtn.disabled = false;
    window.scrollTo(0, document.body.scrollHeight);
  } catch (e) {
    console.error('loadTrackBtn click failed:', e);
    alert('Invalid JSON text.');
  }
}

export function initEvent() {
  maybeFetchTrackUri().then((track) => {
    if (track) {
      trackJson.value = JSON.stringify(track, null, 4);
      // TODO: remove hack, instead listen to map load event before loading track
      setTimeout(loadTrack, 1000);
    }
  });

  fileInput.addEventListener(
    'input',
    () => {
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
    },
    {
      passive: true,
    },
  );

  loadTrackBtn.addEventListener('click', loadTrack, {
    passive: true,
  });
}
