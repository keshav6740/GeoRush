'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  onComplete: () => void;
}

export function CountdownTimer({ onComplete }: CountdownTimerProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  if (count === 0) {
    return (
      <div className="text-6xl font-bold text-center animate-countdown" style={{ color: '#2a9d8f' }}>
        GO!
      </div>
    );
  }

  return (
    <div className="text-8xl font-bold text-center animate-countdown" style={{ color: '#1f6feb' }}>
      {count}
    </div>
  );
}
