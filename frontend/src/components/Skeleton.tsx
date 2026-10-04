interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string;
  height?: string;
  style?: React.CSSProperties;
}

function Skeleton({ className = '', variant = 'rectangular', width, height, style: customStyle }: SkeletonProps) {
  const baseClasses = 'skeleton';
  
  const variantClasses: Record<string, string> = {
    text: 'skeleton-text',
    circular: 'skeleton-circular',
    rectangular: 'skeleton-rectangular',
    card: 'skeleton-card',
  };

  const style: React.CSSProperties = { ...customStyle };
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
}

export default Skeleton;
