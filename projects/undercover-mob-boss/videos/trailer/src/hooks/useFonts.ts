import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

let loaded = false;

export const useFonts = () => {
  if (loaded) return;
  loaded = true;

  loadFont({
    family: 'Cinzel',
    url: staticFile('fonts/cinzel-600.woff2'),
    weight: '600',
  });

  loadFont({
    family: 'Cormorant Garamond',
    url: staticFile('fonts/cormorant-400.woff2'),
    weight: '400',
    style: 'normal',
  });

  loadFont({
    family: 'Cormorant Garamond',
    url: staticFile('fonts/cormorant-400i.woff2'),
    weight: '400',
    style: 'italic',
  });

  loadFont({
    family: 'Cormorant Garamond',
    url: staticFile('fonts/cormorant-600.woff2'),
    weight: '600',
    style: 'normal',
  });
};
