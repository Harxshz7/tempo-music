import { useWindowDimensions } from 'react-native';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isWide: boolean;
  numColumns: number;
  containerClass: string;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 640;
  const isTablet = width >= 640 && width <= 1024;
  const isDesktop = width > 1024;
  const isLandscape = width > height;
  const isWide = isDesktop || (isTablet && isLandscape);

  let numColumns = 2;
  if (width >= 1280) {
    numColumns = 5;
  } else if (width > 1024) {
    numColumns = 4;
  } else if (width >= 640) {
    numColumns = 3;
  }

  const containerClass = isDesktop ? 'max-w-6xl w-full self-center mx-auto' : 'w-full';

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
    isWide,
    numColumns,
    containerClass,
  };
}
