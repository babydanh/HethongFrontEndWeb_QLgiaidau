import React from 'react';
import Image from 'next/image';
import { BRAND } from '@/constants/brand';

export interface BrandLogoProps {
  /**
   * - 'icon': Biểu tượng logo đơn (không kèm chữ) - /sporto_v1.svg
   * - 'full': Logo đầy đủ có kèm tên thương hiệu - /sporto_v1_with_text.svg
   * - '512': Ảnh PNG vuông 512x512
   * - '1024': Ảnh PNG vuông 1024x1024
   */
  variant?: 'icon' | 'full' | '512' | '1024';
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  /** Dùng thẻ img thuần thay vì next/image nếu trong context SVG đặc thù hoặc kích thước linh hoạt */
  useNativeImg?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'icon',
  className = 'w-auto h-auto object-contain',
  alt = BRAND.name,
  width,
  height,
  priority = false,
  useNativeImg = false,
}) => {
  const getSrc = () => {
    switch (variant) {
      case 'full':
        return BRAND.assets.logoFull;
      case '512':
        return BRAND.assets.logo512;
      case '1024':
        return BRAND.assets.logo1024;
      case 'icon':
      default:
        return BRAND.assets.logoIcon;
    }
  };

  const src = getSrc();

  if (useNativeImg || (!width && !height)) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 40}
      height={height || 40}
      className={className}
      priority={priority}
    />
  );
};

export default BrandLogo;
