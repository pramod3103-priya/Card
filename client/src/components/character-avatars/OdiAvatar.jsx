import React from 'react';

/**
 * ODI Avatar (Inspired by Narendra Modi)
 * - Dignified silver-white beard and trimmed mustache
 * - Rectangular glasses with lens glint
 * - Saffron/maroon Indian Nehru jacket over cream kurta with Mandarin collar
 * - Warm, visionary elder statesman expressions
 */
export const OdiAvatar = ({ state = 'idle', size = 64 }) => {
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
        {/* Skin gradients */}
        <linearGradient id="odiSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd3ad" />
          <stop offset="60%" stopColor="#f5b88c" />
          <stop offset="100%" stopColor="#e29e6f" />
        </linearGradient>

        {/* Silver-white hair gradient */}
        <linearGradient id="odiHair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Beard gradient */}
        <linearGradient id="odiBeard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="70%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Nehru Jacket: Rich Saffron / Terracotta Orange */}
        <linearGradient id="odiJacket" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="50%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>

        {/* Inner Kurta: Cream White */}
        <linearGradient id="odiKurta" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>

        {/* Glasses gold rim */}
        <linearGradient id="odiGlasses" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* 3D Drop Shadow */}
        <filter id="odiShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Background Aura (on celebration or thinking) */}
      {isCelebrating && (
        <circle cx="60" cy="60" r="54" fill="none" stroke="#f59e0b" strokeWidth="3" opacity="0.7" className="char-arc-glow" />
      )}
      {isThinking && (
        <circle cx="60" cy="60" r="52" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.8" className="animate-spin" style={{ animationDuration: '8s' }} />
      )}

      {/* Torso & Clothing */}
      <g filter="url(#odiShadow)">
        {/* Inner Kurta Collar (Mandarin Collar) */}
        <path d="M 44 80 L 60 76 L 76 80 L 80 120 L 40 120 Z" fill="url(#odiKurta)" />
        <path d="M 52 75 L 60 84 L 68 75" fill="none" stroke="#d97706" strokeWidth="1.5" />

        {/* Nehru Jacket (Saffron/Terracotta Waistcoat) */}
        <path
          d="M 28 92 C 30 84 46 80 50 82 L 52 120 L 22 120 C 22 108 24 98 28 92 Z"
          fill="url(#odiJacket)"
        />
        <path
          d="M 92 92 C 90 84 74 80 70 82 L 68 120 L 98 120 C 98 108 96 98 92 92 Z"
          fill="url(#odiJacket)"
        />
        {/* Jacket Buttons (Gold) */}
        <circle cx="60" cy="92" r="1.8" fill="#fbbf24" stroke="#78350f" strokeWidth="0.8" />
        <circle cx="60" cy="102" r="1.8" fill="#fbbf24" stroke="#78350f" strokeWidth="0.8" />
        <circle cx="60" cy="112" r="1.8" fill="#fbbf24" stroke="#78350f" strokeWidth="0.8" />
        {/* Tricolor Pocket Lapel Pin */}
        <rect x="36" y="94" width="8" height="2.5" rx="1" fill="#f97316" />
        <rect x="36" y="96.5" width="8" height="2.5" fill="#ffffff" />
        <rect x="36" y="99" width="8" height="2.5" rx="1" fill="#16a34a" />
      </g>

      {/* Neck */}
      <rect x="52" y="68" width="16" height="15" rx="4" fill="url(#odiSkin)" />

      {/* Head Base */}
      <g id="odiHead" filter="url(#odiShadow)">
        {/* Ears */}
        <ellipse cx="36" cy="52" rx="4.5" ry="7" fill="url(#odiSkin)" />
        <ellipse cx="84" cy="52" rx="4.5" ry="7" fill="url(#odiSkin)" />

        {/* Face Silhouette */}
        <path
          d="M 38 48 C 38 32 46 22 60 22 C 74 22 82 32 82 48 C 82 62 76 72 60 74 C 44 72 38 62 38 48 Z"
          fill="url(#odiSkin)"
        />

        {/* Silver-White Hair (Receding / Parted Back) */}
        <path
          d="M 36 46 C 35 34 42 20 60 20 C 78 20 85 34 84 46 C 82 38 78 27 60 26 C 42 27 38 38 36 46 Z"
          fill="url(#odiHair)"
        />
        {/* Sideburns */}
        <path d="M 36 44 L 38 56 L 41 52 Z" fill="url(#odiHair)" />
        <path d="M 84 44 L 82 56 L 79 52 Z" fill="url(#odiHair)" />

        {/* Forehead wrinkles (Distinguished) */}
        <path d="M 49 32 Q 60 30 71 32" stroke="#d97706" strokeWidth="0.8" fill="none" opacity="0.6" />
        <path d="M 52 35 Q 60 33.5 68 35" stroke="#d97706" strokeWidth="0.8" fill="none" opacity="0.5" />

        {/* Eyebrows (Thick White/Silver) */}
        <path
          d={
            isThinking
              ? 'M 45 42 Q 52 39 56 42'
              : isDisappointed
              ? 'M 45 44 Q 52 42 56 41'
              : 'M 45 42 Q 52 40 56 43'
          }
          stroke="url(#odiHair)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={
            isThinking
              ? 'M 64 42 Q 68 38 75 40'
              : isDisappointed
              ? 'M 64 41 Q 68 42 75 44'
              : 'M 64 43 Q 68 40 75 42'
          }
          stroke="url(#odiHair)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyes (With subtle blink animation) */}
        <g className="char-blink">
          {/* Sclera & Pupils */}
          <ellipse cx="51" cy="46" rx="4" ry="2.8" fill="#ffffff" />
          <ellipse cx="69" cy="46" rx="4" ry="2.8" fill="#ffffff" />
          <circle cx="51" cy="46" r="1.8" fill="#332014" />
          <circle cx="69" cy="46" r="1.8" fill="#332014" />
          <circle cx="50.3" cy="45.3" r="0.6" fill="#ffffff" />
          <circle cx="68.3" cy="45.3" r="0.6" fill="#ffffff" />
        </g>

        {/* Nose */}
        <path d="M 58 44 L 60 55 L 63 55" stroke="#c2410c" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Distinctive White Mustache & Full Trimmed Beard */}
        <path
          d="M 40 58 C 42 52 48 53 54 55 C 57 56 60 57 60 57 C 60 57 63 56 66 55 C 72 53 78 52 80 58 C 76 60 70 59 66 58 C 63 59 60 62 60 62 C 60 62 57 59 54 58 C 50 59 44 60 40 58 Z"
          fill="url(#odiBeard)"
        />
        <path
          d="M 40 59 C 39 67 44 79 60 79 C 76 79 81 67 80 59 C 76 68 68 74 60 74 C 52 74 44 68 40 59 Z"
          fill="url(#odiBeard)"
        />

        {/* Mouth (Under mustache) */}
        {isSpeaking ? (
          <ellipse cx="60" cy="62" rx="3.5" ry="2" fill="#7f1d1d" className="animate-pulse" />
        ) : isCelebrating ? (
          <path d="M 54 62 Q 60 66 66 62" stroke="#7f1d1d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        ) : isDisappointed ? (
          <path d="M 54 64 Q 60 61 66 64" stroke="#7f1d1d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M 55 62 Q 60 64 65 62" stroke="#7f1d1d" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        )}

        {/* Rectangular Glasses with Golden Frame & Lens Glint */}
        <g id="odiGlasses">
          {/* Bridge */}
          <path d="M 57 45 Q 60 44 63 45" stroke="url(#odiGlasses)" strokeWidth="1.5" fill="none" />
          {/* Left Frame */}
          <rect
            x="44"
            y="41"
            width="13"
            height="10"
            rx="2.5"
            fill="rgba(255,255,255,0.15)"
            stroke="url(#odiGlasses)"
            strokeWidth="1.6"
          />
          {/* Right Frame */}
          <rect
            x="63"
            y="41"
            width="13"
            height="10"
            rx="2.5"
            fill="rgba(255,255,255,0.15)"
            stroke="url(#odiGlasses)"
            strokeWidth="1.6"
          />
          {/* Glass Glint reflection */}
          <line x1="46" y1="43" x2="52" y2="49" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
          <line x1="65" y1="43" x2="71" y2="49" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
          {/* Temple arms */}
          <line x1="44" y1="44" x2="36" y2="48" stroke="url(#odiGlasses)" strokeWidth="1.4" />
          <line x1="76" y1="44" x2="84" y2="48" stroke="url(#odiGlasses)" strokeWidth="1.4" />
        </g>
      </g>

      {/* Celebration Sparkles */}
      {isCelebrating && (
        <g className="char-sparkle-active">
          <polygon points="60,6 62,12 68,12 63,16 65,22 60,18 55,22 57,16 52,12 58,12" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
          <polygon points="20,24 21,27 24,27 22,29 23,32 20,30 17,32 18,29 16,27 19,27" fill="#f59e0b" />
          <polygon points="100,24 101,27 104,27 102,29 103,32 100,30 97,32 98,29 96,27 99,27" fill="#f59e0b" />
        </g>
      )}

      {/* Disappointed Sweat Drop */}
      {isDisappointed && (
        <path
          d="M 86 42 C 86 42 89 48 89 50 C 89 52 87.5 53 86 53 C 84.5 53 83 52 83 50 C 83 48 86 42 86 42 Z"
          fill="#38bdf8"
          className="char-tear-anim"
        />
      )}
    </svg>
  );
};

