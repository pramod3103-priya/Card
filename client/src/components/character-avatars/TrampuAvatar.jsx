import React from 'react';

/**
 * Trampu Avatar (Inspired by Donald Trump)
 * - Distinctive voluminous golden-blonde swept-back hairstyle
 * - Dark navy suit with iconic long bright red power tie
 * - Sun-kissed / tanned complexion with expressive eyebrows
 */
export const TrampuAvatar = ({ state = 'idle', size = 64 }) => {
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
        {/* Warm Tanned / Sun-Kissed Skin Gradient */}
        <linearGradient id="trampuSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd7b0" />
          <stop offset="60%" stopColor="#f7b07d" />
          <stop offset="100%" stopColor="#e5894b" />
        </linearGradient>

        {/* Voluminous Golden Blonde Hair */}
        <linearGradient id="trampuHair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="80%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>

        {/* Dark Navy Executive Suit */}
        <linearGradient id="trampuSuit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="50%" stopColor="#172554" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Iconic Bright Red Power Tie */}
        <linearGradient id="trampuTie" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>

        {/* Drop Shadow */}
        <filter id="trampuShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Background Aura */}
      {isCelebrating && (
        <circle cx="60" cy="60" r="54" fill="none" stroke="#facc15" strokeWidth="3" opacity="0.85" className="char-arc-glow" />
      )}
      {isThinking && (
        <circle cx="60" cy="60" r="52" fill="none" stroke="#eab308" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.8" className="animate-spin" style={{ animationDuration: '8s' }} />
      )}

      {/* Torso & Suit */}
      <g filter="url(#trampuShadow)">
        {/* Crisp White Collared Dress Shirt */}
        <path d="M 44 76 L 60 84 L 76 76 L 78 120 L 42 120 Z" fill="#ffffff" />

        {/* Iconic Bright Red Power Tie (Broad & Long) */}
        {/* Tie Knot */}
        <polygon points="55,82 65,82 63,89 57,89" fill="url(#trampuTie)" stroke="#7f1d1d" strokeWidth="0.5" />
        {/* Tie Body */}
        <polygon points="56,89 64,89 67,118 60,120 53,118" fill="url(#trampuTie)" stroke="#7f1d1d" strokeWidth="0.5" />
        {/* Tie Gold Clip */}
        <rect x="55" y="98" width="10" height="1.8" rx="0.5" fill="#facc15" stroke="#a16207" strokeWidth="0.4" />

        {/* Deep Navy Executive Suit */}
        <path
          d="M 22 92 C 24 84 42 80 46 84 L 52 120 L 16 120 C 16 108 18 98 22 92 Z"
          fill="url(#trampuSuit)"
        />
        <path
          d="M 98 92 C 96 84 78 80 74 84 L 68 120 L 104 120 C 104 108 102 98 98 92 Z"
          fill="url(#trampuSuit)"
        />

        {/* Broad Suit Lapels */}
        <path d="M 46 84 L 34 100 L 46 106 L 52 94 Z" fill="#1e3a8a" stroke="#0f172a" strokeWidth="0.8" />
        <path d="M 74 84 L 86 100 L 74 106 L 68 94 Z" fill="#1e3a8a" stroke="#0f172a" strokeWidth="0.8" />

        {/* American Flag Pin on Left Lapel */}
        <rect x="36" y="96" width="6" height="4" rx="0.5" fill="#dc2626" />
        <rect x="36" y="97.3" width="6" height="1.4" fill="#ffffff" />
        <rect x="36" y="96" width="2.5" height="2" fill="#1d4ed8" />
      </g>

      {/* Neck */}
      <rect x="51" y="68" width="18" height="15" rx="3" fill="url(#trampuSkin)" />

      {/* Head Base */}
      <g id="trampuHead" filter="url(#trampuShadow)">
        {/* Ears */}
        <ellipse cx="37" cy="54" rx="4.5" ry="7" fill="url(#trampuSkin)" />
        <ellipse cx="83" cy="54" rx="4.5" ry="7" fill="url(#trampuSkin)" />

        {/* Broad Face Silhouette */}
        <path
          d="M 38 48 C 38 32 45 23 60 23 C 75 23 82 32 82 48 C 82 62 76 73 60 75 C 44 73 38 62 38 48 Z"
          fill="url(#trampuSkin)"
        />

        {/* Lighter skin circles around eyes (sunbed effect) */}
        <ellipse cx="50" cy="47" rx="8" ry="6" fill="#fde68a" opacity="0.3" />
        <ellipse cx="70" cy="47" rx="8" ry="6" fill="#fde68a" opacity="0.3" />

        {/* Distinctive Swept-Back Golden Bouffant Hairstyle */}
        {/* Main Hair Volume */}
        <path
          d="M 34 46 C 30 36 34 18 52 16 C 68 14 88 17 90 28 C 92 36 88 46 86 52 C 84 44 82 32 72 26 C 60 20 44 24 38 38 C 36 42 34 46 34 46 Z"
          fill="url(#trampuHair)"
        />
        {/* Iconic Golden Front Swoop */}
        <path
          d="M 38 34 C 44 18 64 16 78 20 C 86 23 89 30 87 35 C 80 27 68 25 54 28 C 44 30 40 33 38 34 Z"
          fill="#fef08a"
        />
        {/* Hair crest sweep lines */}
        <path d="M 42 22 Q 58 17 76 22" stroke="#ca8a04" strokeWidth="1.2" fill="none" opacity="0.7" />
        <path d="M 46 26 Q 62 21 80 26" stroke="#ca8a04" strokeWidth="1.2" fill="none" opacity="0.7" />

        {/* Eyebrows (Prominent Golden Blonde) */}
        <path
          d={
            isThinking
              ? 'M 44 42 Q 50 37 56 41'
              : isDisappointed
              ? 'M 44 43 Q 50 42 56 40'
              : 'M 44 42 Q 50 39 56 42'
          }
          stroke="#ca8a04"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={
            isThinking
              ? 'M 64 41 Q 70 36 76 39'
              : isDisappointed
              ? 'M 64 40 Q 70 42 76 43'
              : 'M 64 42 Q 70 39 76 42'
          }
          stroke="#ca8a04"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />

        {/* Confident Squint Eyes with Blink Animation */}
        <g className="char-blink">
          <ellipse cx="50" cy="47" rx="3.8" ry="2.2" fill="#ffffff" />
          <ellipse cx="70" cy="47" rx="3.8" ry="2.2" fill="#ffffff" />
          {/* Blue-hazel iris */}
          <circle cx="50" cy="47" r="1.6" fill="#0284c7" />
          <circle cx="70" cy="47" r="1.6" fill="#0284c7" />
          <circle cx="50" cy="47" r="0.8" fill="#0f172a" />
          <circle cx="70" cy="47" r="0.8" fill="#0f172a" />
          <circle cx="49.5" cy="46.5" r="0.4" fill="#ffffff" />
          <circle cx="69.5" cy="46.5" r="0.4" fill="#ffffff" />
        </g>

        {/* Nose */}
        <path d="M 59 44 L 60 56 L 64 56" stroke="#c2410c" strokeWidth="1.4" fill="none" opacity="0.75" strokeLinecap="round" />

        {/* Mouth */}
        {isSpeaking ? (
          /* Signature animated "O" dealmaker mouth */
          <ellipse cx="60" cy="65" rx="3.5" ry="3" fill="#7f1d1d" className="animate-pulse" />
        ) : isCelebrating ? (
          /* Broad winning smile */
          <g>
            <path d="M 52 63 Q 60 69 68 63" stroke="#991b1b" strokeWidth="2" fill="#7f1d1d" strokeLinecap="round" />
            <path d="M 54 64 Q 60 67 66 64" fill="#ffffff" />
          </g>
        ) : isDisappointed ? (
          /* Signature downturned pout */
          <path d="M 52 66 Q 60 62 68 66" stroke="#991b1b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        ) : (
          /* Confident slight smirk */
          <path d="M 54 65 Q 60 66 66 64" stroke="#991b1b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        )}
      </g>

      {/* Celebration Sparkles */}
      {isCelebrating && (
        <g className="char-sparkle-active">
          <polygon points="60,4 63,11 70,11 64,15 67,22 60,17 53,22 56,15 50,11 57,11" fill="#facc15" stroke="#ca8a04" strokeWidth="0.5" />
          <polygon points="20,22 22,25 25,25 23,27 24,30 20,28 16,30 17,27 15,25 18,25" fill="#facc15" />
          <polygon points="100,22 102,25 105,25 103,27 104,30 100,28 96,30 97,27 95,25 98,25" fill="#facc15" />
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

