import type { TrackData } from './index.types';

type Global = {
  trackData: TrackData | null;
  selectedIndex: number | null;
};

export const global: Global = {
  trackData: null,
  selectedIndex: null,
};
