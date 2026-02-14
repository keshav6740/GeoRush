'use client';

interface GameTimerProps {
  timeRemaining: number;
  duration: number;
}

export function GameTimer({ timeRemaining, duration }: GameTimerProps) {
  const percentage = (timeRemaining / duration) * 100;
  let timerClass = 'timer-display';

  if (percentage <= 20) {
    timerClass += ' critical';
  } else if (percentage <= 50) {
    timerClass += ' warning';
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={timerClass}>{display}</div>
      <div className="w-full bg-[#f8fafc] rounded-full h-2 border border-[#1f6feb] border-opacity-30">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: percentage <= 20 ? '#e76f51' : percentage <= 50 ? '#f4a261' : '#1f6feb',
          }}
        />
      </div>
    </div>
  );
}
