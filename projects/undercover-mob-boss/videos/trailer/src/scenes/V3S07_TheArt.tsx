import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { FadeTransition } from '../components/FadeTransition';
import { NOIR } from '../lib/colors';
import { FONT_DISPLAY } from '../lib/fonts';

/**
 * S07 — The Art (11s / 330f)
 * Gallery of game assets appearing one by one — cards, roles, audio waveform.
 * "Every card. Every face. Every voice — including this one — generated."
 */

interface AssetCardProps {
  src: string;
  label: string;
  startFrame: number;
  width: number;
  height: number;
}

const AssetCard: React.FC<AssetCardProps> = ({
  src,
  label,
  startFrame,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame) return null;

  const scale = spring({
    fps,
    frame: frame - startFrame,
    config: { damping: 80 },
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `scale(${scale})`,
        opacity: scale,
      }}
    >
      <div
        style={{
          width,
          height,
          border: `2px solid ${NOIR.gold}60`,
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: `0 4px 20px ${NOIR.black}80`,
        }}
      >
        <Img
          src={src}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 12,
          color: NOIR.muted,
          letterSpacing: '0.1em',
          marginTop: 8,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const V3S07_TheArt: React.FC = () => {
  const frame = useCurrentFrame();

  // "INCLUDING THIS ONE" — first beat
  const micDropFrame = 150;
  const micDropOpacity = interpolate(
    frame,
    [micDropFrame, micDropFrame + 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // "EVEN THIS VIDEO." — second beat, bigger, gold glow
  const videoFrame = 195;
  const videoOpacity = interpolate(
    frame,
    [videoFrame, videoFrame + 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: NOIR.black }}>
      {/* Background: gallery image */}
      <AbsoluteFill style={{ opacity: 0.25 }}>
        <Img
          src={staticFile('assets/v3-asset-gallery.jpg')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      {/* Asset cards appearing in a grid */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 24, marginBottom: 40 }}>
          {/* Role cards */}
          <AssetCard
            src={staticFile('assets/role-citizen.png')}
            label="CITIZEN"
            startFrame={15}
            width={120}
            height={160}
          />
          <AssetCard
            src={staticFile('assets/role-mob-soldier.png')}
            label="MOB SOLDIER"
            startFrame={35}
            width={120}
            height={160}
          />
          <AssetCard
            src={staticFile('assets/role-mob-boss.png')}
            label="MOB BOSS"
            startFrame={55}
            width={120}
            height={160}
          />
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
          {/* Policy cards */}
          <AssetCard
            src={staticFile('assets/cards/casino-license-fast-track.webp')}
            label="CORRUPT POLICY"
            startFrame={75}
            width={100}
            height={140}
          />
          <AssetCard
            src={staticFile('assets/cards/bridge-safety-inspection.webp')}
            label="VIRTUOUS POLICY"
            startFrame={90}
            width={100}
            height={140}
          />
          <AssetCard
            src={staticFile('assets/cards/backroom-bail-reform.webp')}
            label="CORRUPT POLICY"
            startFrame={105}
            width={100}
            height={140}
          />
          <AssetCard
            src={staticFile('assets/cards/fire-brigade-funding.webp')}
            label="VIRTUOUS POLICY"
            startFrame={120}
            width={100}
            height={140}
          />
        </div>

        {/* "INCLUDING THIS ONE" — first beat */}
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            color: NOIR.cream,
            letterSpacing: '0.15em',
            opacity: micDropOpacity,
            marginTop: 20,
          }}
        >
          INCLUDING THIS ONE.
        </div>

        {/* "EVEN THIS VIDEO." — second beat, bigger */}
        {frame >= videoFrame && (
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 32,
              color: NOIR.gold,
              letterSpacing: '0.2em',
              textShadow: `0 0 40px ${NOIR.gold}80`,
              opacity: videoOpacity,
              marginTop: 12,
            }}
          >
            EVEN THIS VIDEO.
          </div>
        )}
      </AbsoluteFill>

      {/* Counter overlay — asset counts */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 60,
            opacity: interpolate(frame, [130, 150], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {[
            { n: '53', label: 'IMAGES' },
            { n: '104', label: 'AUDIO FILES' },
            { n: '157', label: 'TOTAL ASSETS' },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                fontFamily: FONT_DISPLAY,
              }}
            >
              <div style={{ fontSize: 32, color: NOIR.gold, fontWeight: 'bold' }}>
                {stat.n}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: NOIR.muted,
                  letterSpacing: '0.15em',
                  marginTop: 4,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>

      <FadeTransition type="in" durationFrames={10} />
      <FadeTransition type="out" durationFrames={15} />
    </AbsoluteFill>
  );
};
