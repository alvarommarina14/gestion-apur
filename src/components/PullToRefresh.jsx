import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const containerRef = useRef(null);

  const REFRESH_THRESHOLD = 80;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (container.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (container.scrollTop !== 0) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startYRef.current;

      if (distance > 0 && !isRefreshing) {
        e.preventDefault();
        setPullDistance(Math.min(distance, REFRESH_THRESHOLD * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= REFRESH_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(REFRESH_THRESHOLD);
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          startYRef.current = 0;
        }
      } else {
        setPullDistance(0);
        startYRef.current = 0;
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  return (
    <div ref={containerRef} className="relative overflow-y-auto h-full">
      {/* Pull-to-refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center transition-all duration-200"
        style={{
          height: `${pullDistance}px`,
          zIndex: 10
        }}
      >
        {pullDistance > 0 && (
          <div className="flex flex-col items-center">
            <RefreshCw 
              className="w-6 h-6 text-emerald-600"
              style={{
                transform: `rotate(${Math.min(pullDistance / 80 * 360, 360)}deg)`,
                opacity: Math.min(pullDistance / REFRESH_THRESHOLD, 1)
              }}
            />
            <span className="text-xs text-slate-500 mt-1">
              {pullDistance >= REFRESH_THRESHOLD ? 'Suelta para actualizar' : 'Desliza para actualizar'}
            </span>
          </div>
        )}
      </div>

      {/* Content with padding to account for indicator */}
      <div style={{ paddingTop: isRefreshing ? REFRESH_THRESHOLD : 0 }}>
        {children}
      </div>

      {/* Loading spinner */}
      {isRefreshing && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
        </div>
      )}
    </div>
  );
}