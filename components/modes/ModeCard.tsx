'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface ModeCardProps {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  color: 'cyan' | 'lime' | 'pink' | 'orange';
}

export function ModeCard({ href, icon, title, description, color }: ModeCardProps) {
  const colorClasses = {
    cyan: 'border-[#1f6feb] hover:shadow-[0_0_30px_rgba(0,217,255,0.3)]',
    lime: 'border-[#2a9d8f] hover:shadow-[0_0_30px_rgba(0,255,65,0.3)]',
    pink: 'border-[#e76f51] hover:shadow-[0_0_30px_rgba(255,0,110,0.3)]',
    orange: 'border-[#f4a261] hover:shadow-[0_0_30px_rgba(255,107,53,0.3)]',
  };

  const iconColors = {
    cyan: 'text-[#1f6feb]',
    lime: 'text-[#2a9d8f]',
    pink: 'text-[#e76f51]',
    orange: 'text-[#f4a261]',
  };

  return (
    <Link href={href}>
      <div className={`neon-card p-6 h-full cursor-pointer group ${colorClasses[color]}`}>
        <div className={`text-5xl mb-4 ${iconColors[color]} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-[#1f2937] mb-2">{title}</h2>
        <p className="text-[#5a6b7a] mb-4">{description}</p>
        <div className="inline-block px-4 py-2 rounded-lg text-sm font-semibold border-2" style={{
          borderColor: color === 'cyan' ? '#1f6feb' : color === 'lime' ? '#2a9d8f' : color === 'pink' ? '#e76f51' : '#f4a261',
          color: color === 'cyan' ? '#1f6feb' : color === 'lime' ? '#2a9d8f' : color === 'pink' ? '#e76f51' : '#f4a261',
        }}>
          Play Now
        </div>
      </div>
    </Link>
  );
}
