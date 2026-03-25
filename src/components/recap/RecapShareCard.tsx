import { forwardRef } from 'react';
import type { RecapData, WeekPhoto } from './WeeklyRecapSlides';

const GOLD = '#C9A84C';
const BG = '#0D0D0D';
const SERIF = "'DM Serif Display', Georgia, serif";
const SANS = "'Satoshi', system-ui, sans-serif";

// BeReal-style single photo cell: main image + selfie overlay
const PhotoCell = ({
  photo,
  style,
  selfiePosition = 'bottom-right',
}: {
  photo: WeekPhoto;
  style?: React.CSSProperties;
  selfiePosition?: 'top-right' | 'bottom-right' | 'bottom-left';
}) => {
  const selfieStyle: React.CSSProperties = {
    position: 'absolute',
    width: '30%',
    aspectRatio: '1 / 1',
    borderRadius: 6,
    overflow: 'hidden',
    border: `2px solid ${BG}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
    ...(selfiePosition === 'top-right'
      ? { top: 8, right: 8 }
      : selfiePosition === 'bottom-left'
      ? { bottom: 8, left: 8 }
      : { bottom: 8, right: 8 }),
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }}>
      <img
        src={photo.photoUrl}
        alt=""
        crossOrigin="anonymous"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {photo.selfieUrl && (
        <div style={selfieStyle}>
          <img
            src={photo.selfieUrl}
            alt=""
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
    </div>
  );
};

// Photo collage: up to 3 photos in a BeReal-inspired layout
const PhotoCollage = ({ photos }: { photos: WeekPhoto[] }) => {
  const top3 = photos.slice(0, 3);

  if (top3.length === 0) {
    // No photos — show a branded placeholder
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1A1A1A 0%, #111 100%)',
        }}
      >
        <span style={{ fontFamily: SERIF, fontSize: 40, color: GOLD, letterSpacing: '0.15em' }}>
          TROVE
        </span>
      </div>
    );
  }

  if (top3.length === 1) {
    return (
      <PhotoCell
        photo={top3[0]}
        selfiePosition="top-right"
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  if (top3.length === 2) {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', gap: 2 }}>
        <PhotoCell
          photo={top3[0]}
          selfiePosition="bottom-right"
          style={{ flex: '0 0 calc(62% - 1px)', height: '100%' }}
        />
        <PhotoCell
          photo={top3[1]}
          selfiePosition="bottom-left"
          style={{ flex: '0 0 calc(38% - 1px)', height: '100%' }}
        />
      </div>
    );
  }

  // 3 photos: large left, two stacked on right
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', gap: 2 }}>
      <PhotoCell
        photo={top3[0]}
        selfiePosition="top-right"
        style={{ flex: '0 0 calc(62% - 1px)', height: '100%' }}
      />
      <div
        style={{
          flex: '0 0 calc(38% - 1px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <PhotoCell photo={top3[1]} style={{ flex: 1, overflow: 'hidden' }} />
        <PhotoCell photo={top3[2]} style={{ flex: 1, overflow: 'hidden' }} />
      </div>
    </div>
  );
};

interface RecapShareCardProps {
  data: RecapData;
  userName: string;
}

export const RecapShareCard = forwardRef<HTMLDivElement, RecapShareCardProps>(
  ({ data, userName }, ref) => {
    const hasPhotos = data.weekPhotos.length > 0;
    const streakChangeAbs = Math.abs(data.streakChange);
    const streakUp = data.streakChange > 0;
    const streakDown = data.streakChange < 0;

    return (
      <div
        ref={ref}
        style={{
          width: 390,
          backgroundColor: BG,
          borderRadius: 24,
          overflow: 'hidden',
          fontFamily: SANS,
          userSelect: 'none',
          // Explicit size for html2canvas
          flexShrink: 0,
        }}
      >
        {/* ── Photo collage ───────────────────────────────── */}
        <div
          style={{
            width: '100%',
            height: 248,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#111',
          }}
        >
          <PhotoCollage photos={data.weekPhotos} />

          {/* Week label overlay */}
          {hasPhotos && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                borderRadius: 20,
                padding: '4px 10px',
              }}
            >
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                {data.weekRange}
              </span>
            </div>
          )}
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        <div style={{ padding: '18px 22px 20px' }}>
          {/* Streak row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontFamily: SERIF,
                fontSize: 68,
                color: GOLD,
                lineHeight: 1,
                letterSpacing: '-2px',
              }}
            >
              {data.currentStreak}
            </span>
            <div style={{ paddingBottom: 8 }}>
              <div
                style={{
                  fontSize: 15,
                  color: GOLD,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}
              >
                day streak 🔥
              </div>
              {data.streakChange !== 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: streakUp
                      ? '#4CAF82'
                      : streakDown
                      ? '#E05C5C'
                      : 'rgba(255,255,255,0.4)',
                    marginTop: 2,
                  }}
                >
                  {streakUp ? '↑' : '↓'} {streakUp ? '+' : '-'}
                  {streakChangeAbs} from last week
                </div>
              )}
            </div>
          </div>

          {/* Days posted */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontFamily: SERIF,
                fontSize: 26,
                color: '#FFFFFF',
                lineHeight: 1,
              }}
            >
              {data.daysPosted}
            </span>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)' }}>
              /7 days this week
            </span>
          </div>

          {/* Day dots */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
            {data.dayStatuses.map((day, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: day.posted ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${day.posted ? GOLD : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: day.posted ? GOLD : 'rgba(255,255,255,0.2)',
                  }}
                >
                  {day.posted ? '✓' : '·'}
                </div>
                <span
                  style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.35)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {day.day.slice(0, 2)}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, rgba(201,168,76,0.4) 0%, rgba(201,168,76,0.05) 100%)',
              marginBottom: 14,
            }}
          />

          {/* Name + branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 15,
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 600,
                letterSpacing: '0.01em',
              }}
            >
              {userName}
            </span>
            <span
              style={{
                fontFamily: SERIF,
                fontSize: 20,
                color: GOLD,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Trove
            </span>
          </div>
        </div>
      </div>
    );
  }
);

RecapShareCard.displayName = 'RecapShareCard';
