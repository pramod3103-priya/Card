import React from 'react';

/**
 * Put-in Avatar (Inspired by Vladimir Putin)
 * - Short blonde-gray receded hair
 * - Dark charcoal formal executive suit with ice-blue silk tie
 * - Sharp cheekbones, steely cold blue eyes, disciplined stoic posture
 */
export const PutinAvatar = ({ state = 'idle', size = 64 }) => {
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';
  const isCelebrating = state === 'celebrating';
  const isDisappointed = state === 'disappointed';

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`select-none overflow-visible ${
        isThinking
          ? 'char-anim-thinking'
          : isSpeaking
          ? 'char-anim-speaking'
          : isCelebrating
          ? 'char-anim-celebrating'
          : isDisappointed
          ? 'char-anim-disappointed'
          : 'char-anim-idle'
      }`}
    >
      <defs>
        {/* Fair cool skin gradient */}
        <linearGradient id="putinSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbe2d5" />
          <stop offset="60%" stopColor="#f3cbb8" />
          <stop offset="100%" stopColor="#ddaa93" />
        </linearGradient>

        {/* Short Blonde-Gray Hair */}
        <linearGradient id="putinHair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2d4b7" />
          <stop offset="60%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Charcoal Executive Suit */}
        <linearGradient id="putinSuit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="50%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Ice-Blue Silk Tie */}
        <linearGradient id="putinTie" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        {/* Shadow filter */}
        <filter id="putinShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Background Aura */}
      {isCelebrating && (
        <circle cx="60" cy="60" r="54" fill="none" stroke="#38bdf8" strokeWidth="3" opacity="0.8" className="char-arc-glow" />
      )}
      {isThinking && (
        <circle cx="60" cy="60" r="52" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.8" className="animate-spin" style={{ animationDuration: '8s' }} />
      )}

      {/* Torso & Suit */}
      <g filter="url(#putinShadow)">
        {/* Crisp White Shirt Collar */}
        <path d="M 46 76 L 60 84 L 74 76 L 76 120 L 44 120 Z" fill="#ffffff" />

        {/* Ice-Blue Silk Tie */}
        {/* Tie Knot */}
        <polygon points="56,82 64,82 62,88 58,88" fill="url(#putinTie)" stroke="#0369a1" strokeWidth="0.5" />
        {/* Tie Body */}
        <polygon points="58,88 62,88 65,116 60,120 55,116" fill="url(#putinTie)" stroke="#0369a1" strokeWidth="0.5" />
        {/* Subtle tie stripe */}
        <line x1="57" y1="96" x2="63" y2="93" stroke="#bae6fd" strokeWidth="1" opacity="0.6" />
        <line x1="56" y1="104" x2="64" y2="101" stroke="#bae6fd" strokeWidth="1" opacity="0.6" />

        {/* Dark Charcoal Suit Jacket */}
        <path
          d="M 24 92 C 26 84 44 80 48 84 L 54 120 L 18 120 C 18 108 20 98 24 92 Z"
          fill="url(#putinSuit)"
        />
        <path
          d="M 96 92 C 94 84 76 80 72 84 L 66 120 L 102 120 C 102 108 100 98 96 92 Z"
          fill="url(#putinSuit)"
        />

        {/* Peaked Lapels */}
        <path d="M 48 84 L 38 98 L 48 104 L 54 94 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
        <path d="M 72 84 L 82 98 L 72 104 L 66 94 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
      </g>

      {/* Neck */}
      <rect x="52" y="68" width="16" height="15" rx="3" fill="url(#putinSkin)" />

      {/* Head Base */}
      <g id="putinHead" filter="url(#putinShadow)">
        {/* Ears */}
        <ellipse cx="37" cy="53" rx="4.5" ry="7" fill="url(#putinSkin)" />
        <ellipse cx="83" cy="53" rx="4.5" ry="7" fill="url(#putinSkin)" />

        {/* Angular Face Silhouette (Firm Jawline & High Cheekbones) */}
        <path
          d="M 39 46 C 39 30 46 22 60 22 C 74 22 81 30 81 46 C 81 58 77 68 68 73 C 64 75 56 75 52 73 C 43 68 39 58 39 46 Z"
          fill="url(#putinSkin)"
        />

        {/* High cheekbone subtle definition */}
        <path d="M 43 52 Q 48 55 52 53" stroke="#ddaa93" strokeWidth="1" fill="none" opacity="0.7" />
        <path d="M 77 52 Q 72 55 68 53" stroke="#ddaa93" strokeWidth="1" fill="none" opacity="0.7" />

        {/* Short Blonde-Gray Hair (Receding hairline at temples) */}
        <path
          d="M 37 45 C 37 32 44 20 60 20 C 76 20 83 32 83 45 C 81 38 78 28 69 26 C 65 25 55 25 51 26 C 42 28 39 38 37 45 Z"
          fill="url(#putinHair)"
        />
        {/* Forehead peak subtle recede */}
        <path d="M 52 26 Q 60 28 68 26 L 60 24 Z" fill="url(#putinHair)" />

        {/* Eyebrows (Fair, subtle, determined) */}
        <path
          d={
            isThinking
              ? 'M 46 43 Q 51 40 56 42'
              : isDisappointed
              ? 'M 46 44 Q 51 43 56 42'
              : 'M 46 43 Q 51 41 56 42'
          }
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={
            isThinking
              ? 'M 64 42 Q 69 39 74 41'
              : isDisappointed
              ? 'M 64 42 Q 69 43 74 44'
              : 'M 64 42 Q 69 41 74 43'
          }
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyes (Steely, Cold Light-Blue) */}
        <g className="char-blink">
          <ellipse cx="51" cy="47" rx="3.8" ry="2.5" fill="#ffffff" />
          <ellipse cx="69" cy="47" rx="3.8" ry="2.5" fill="#ffffff" />
          {/* Light-blue iris */}
          <circle cx="51" cy="47" r="1.8" fill="#38bdf8" />
          <circle cx="69" cy="47" r="1.8" fill="#38bdf8" />
          {/* Pupil */}
          <circle cx="51" cy="47" r="0.9" fill="#0f172a" />
          <circle cx="69" cy="47" r="0.9" fill="#0f172a" />
          {/* Specular highlight */}
          <circle cx="50.4" cy="46.4" r="0.5" fill="#ffffff" />
          <circle cx="68.4" cy="46.4" r="0.5" fill="#ffffff" />
        </g>

        {/* Straight nose */}
        <path d="M 59 44 L 60 56 L 63 56" stroke="#c084fc" strokeWidth="0" />
        <path d="M 59 44 L 60 56 L 63 56" stroke="#c2410c" strokeWidth="1" fill="none" opacity="0.7" strokeLinecap="round" />

        {/* Thin, disciplined mouth */}
        {isSpeaking ? (
          <ellipse cx="60" cy="64" rx="3.2" ry="1.8" fill="#450a0a" className="animate-pulse" />
        ) : isCelebrating ? (
          /* Subtle confident smirk */
          <path d="M 53 64 Q 60 65 67 63" stroke="#7f1d1d" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        ) : isDisappointed ? (
          <path d="M 53 65 Q 60 63 67 65" stroke="#7f1d1d" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        ) : (
          <line x1="54" y1="64" x2="66" y2="64" stroke="#7f1d1d" strokeWidth="1.5" strokeLinecap="round" />
        )}

        {/* Firm chin cleft / shadow */}
        <circle cx="60" cy="69" r="1" fill="#ddaa93" />
      </g>

      {/* Celebration Sparkles */}
      {isCelebrating && (
        <g className="char-sparkle-active">
          <polygon points="60,6 62,12 68,12 63,16 65,22 60,18 55,22 57,16 52,12 58,12" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.5" />
          <polygon points="22,24 23,27 26,27 24,29 25,32 22,30 19,32 20,29 18,27 21,27" fill="#0284c7" />
          <polygon points="98,24 99,27 102,27 100,29 101,32 98,30 95,32 96,29 94,27 97,27" fill="#0284c7" />
        </g>
      )}

      {/* Disappointed Sweat Drop */}
      {isDisappointed && (
        <path
          d="M 85 43 C 85 43 88 49 88 51 C 88 53 86.5 54 85 54 C 83.5 54 82 53 82 51 C 82 49 85 43 85 43 Z"
          fill="#38bdf8"
          className="char-tear-anim"
        />
      )}
    </svg>
  );
};

