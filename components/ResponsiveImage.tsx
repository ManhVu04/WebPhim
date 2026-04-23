import React from 'react';
import Image from 'next/image';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: 'blur' | 'empty';
  priority?: boolean;
}

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  width = 800,
  height = 600,
  className = '',
  placeholder = 'blur',
  priority = false,
}) => {
  // Tạo các kích thước responsive
  const sizes = [
    { width: 320, media: '(max-width: 640px)' },
    { width: 640, media: '(max-width: 1024px)' },
    { width: 1024, media: '' },
  ];

  const srcSet = sizes
    .map(size => `${src}?w=${size.width} ${size.width}w`)
    .join(', ');

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {/* Hình ảnh chính với lazy loading và placeholder */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        srcSet={srcSet}
        sizes="(max-width: 640px) 320px, (max-width: 1024px) 640px, 1024px"
        loading={priority ? 'eager' : 'lazy'}
        placeholder={placeholder}
        className="transition-opacity duration-300"
        style={{
          opacity: placeholder === 'blur' ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />

      {/* Fallback nếu hình ảnh không load được */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500"
        style={{ display: 'none' }}
        aria-hidden="true"
      >
        Không thể tải hình ảnh
      </div>
    </div>
  );
};

export default ResponsiveImage;