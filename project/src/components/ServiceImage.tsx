import { useState } from 'react';
import { Icon } from '@/components/Icon';

/**
 * Renders a service/category image if available, falling back to a Lucide icon
 * inside a colored badge. Handles broken image URLs gracefully by switching
 * to the fallback icon automatically.
 */
export function ServiceImage({
  imageUrl,
  fallbackIcon,
  bg,
  text,
  size = 'md',
  rounded = 'rounded-xl',
}: {
  imageUrl?: string | null;
  fallbackIcon: string;
  bg: string;
  text: string;
  size?: 'sm' | 'md' | 'lg';
  rounded?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const hasImage = imageUrl && !imgError;

  const dims = {
    sm: { box: 'h-10 w-10', icon: 'h-5 w-5' },
    md: { box: 'h-12 w-12', icon: 'h-6 w-6' },
    lg: { box: 'h-14 w-14', icon: 'h-7 w-7' },
  }[size];

  if (hasImage) {
    return (
      <div className={`shrink-0 overflow-hidden ${dims.box} ${rounded} ring-1 ring-slate-200`}>
        <img
          src={imageUrl!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`flex shrink-0 items-center justify-center ${dims.box} ${rounded} ${bg} ${text}`}>
      <Icon name={fallbackIcon || 'ImageOff'} className={dims.icon} />
    </div>
  );
}
