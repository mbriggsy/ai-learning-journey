import { useVideoConfig } from 'remotion';

export type LayoutMode = 'landscape' | 'portrait';

export interface LayoutInfo {
  mode: LayoutMode;
  width: number;
  height: number;
  isPortrait: boolean;
  scale: number; // relative to 1920px baseline
}

export const useLayout = (): LayoutInfo => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  return {
    mode: isPortrait ? 'portrait' : 'landscape',
    width,
    height,
    isPortrait,
    scale: width / 1920,
  };
};
