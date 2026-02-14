import { ImageResponse } from 'next/og';
import React from 'react';

export const runtime = 'edge';

function getParam(searchParams: URLSearchParams, key: string, fallback: string) {
  const value = searchParams.get(key);
  return value && value.trim() ? value : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = getParam(searchParams, 'mode', 'GeoRush');
  const score = getParam(searchParams, 'score', '0');
  const accuracy = getParam(searchParams, 'accuracy', '0');
  const correct = getParam(searchParams, 'correct', '0');
  const total = getParam(searchParams, 'total', '0');
  const streak = getParam(searchParams, 'streak', '0');
  const badges = getParam(searchParams, 'badges', '0');
  const date = getParam(searchParams, 'date', new Date().toISOString().slice(0, 10));

  const iconStyle = {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: '#2a9d8f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    color: '#ffffff',
    fontWeight: 700,
  } as const;

  const rootStyle = {
    width: '1200px',
    height: '630px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '64px',
    background: 'linear-gradient(135deg, #fef6e4 0%, #d4f1f4 50%, #fde2e4 100%)',
    color: '#1f2937',
    fontFamily: 'Arial, sans-serif',
  } as const;

  const header = React.createElement(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
    React.createElement('div', { style: iconStyle }, 'G'),
    React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column' } },
      React.createElement('div', { style: { fontSize: '36px', fontWeight: 800 } }, 'GeoRush'),
      React.createElement('div', { style: { fontSize: '18px', opacity: 0.7 } }, date)
    )
  );

  const scoreBlock = React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
    React.createElement('div', { style: { fontSize: '48px', fontWeight: 800 } }, mode),
    React.createElement('div', { style: { fontSize: '28px' } }, `Score: ${score}`),
    React.createElement(
      'div',
      { style: { fontSize: '24px' } },
      `Accuracy: ${accuracy}% (${correct}/${total})`
    ),
    React.createElement('div', { style: { fontSize: '22px' } }, `Streak: ${streak} day(s) | Badges: ${badges}`)
  );

  const footer = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '20px',
        color: '#264653',
      },
    },
    React.createElement('div', null, 'Think fast. Learn fast.'),
    React.createElement('div', { style: { fontWeight: 700 } }, 'georush.app')
  );

  return new ImageResponse(
    React.createElement('div', { style: rootStyle }, header, scoreBlock, footer),
    {
      width: 1200,
      height: 630,
    }
  );
}
