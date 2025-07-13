// A simple utility to provide CSS linear gradients for common colormaps.

type Colormap = 'rainbow' | 'hot' | 'cool' | 'viridis' | 'plasma';

// Pre-defined CSS linear gradients for various colormaps
const colormapGradients: Record<Colormap, string> = {
  rainbow: 'linear-gradient(to top, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
  hot: 'linear-gradient(to top, #000000, #ff0000, #ffff00, #ffffff)',
  cool: 'linear-gradient(to top, #00ffff, #ff00ff)',
  viridis: 'linear-gradient(to top, #440154, #3b528b, #21918c, #5ec962, #fde725)',
  plasma: 'linear-gradient(to top, #0d0887, #6a00a8, #b12a90, #e16462, #fca636, #f0f921)',
};

/**
 * Returns a CSS linear-gradient string for a given colormap name.
 * @param name The name of the colormap.
 * @returns A CSS string for the linear-gradient background.
 */
export const getColormapGradient = (name: string): string => {
  const sanitizedName = name.toLowerCase() as Colormap;
  return colormapGradients[sanitizedName] || colormapGradients.rainbow;
};

/**
 * A list of available colormap options for UI selectors.
 */
export const colormapOptions = [
    { label: '彩虹 (Rainbow)', value: 'rainbow' },
    { label: '热图 (Hot)', value: 'hot' },
    { label: '冷图 (Cool)', value: 'cool' },
    { label: 'Viridis', value: 'viridis' },
    { label: 'Plasma', value: 'plasma' },
]; 