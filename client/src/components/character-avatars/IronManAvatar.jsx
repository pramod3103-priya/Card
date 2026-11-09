import React from 'react';

/**
 * Iron Man Avatar (Marvel Superhero Inspired)
 * - Crimson red and titanium gold metallic armor
 * - Glowing illuminated cyan-blue HUD visor eyes
 * - Pulsing cyan-blue Arc Reactor in chest plate
 * - Specular bevels and cybernetic panel seams
 */
export const IronManAvatar = ({ state = 'idle', size = 64 }) => {
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
        {/* Crimson Metallic Armor Gradient */}
        <linearGradient id="ironCrimson" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="35%" stopColor="#dc2626" />
          <stop offset="70%" stopColor="#991b1b" />
          <stop offset="100%" stopColor="#450a0a" />
        </linearGradient>

        {/* Brushed Titanium Gold Faceplate Gradient */}
        <linearGradient id="ironGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="30%" stopColor="#facc15" />
          <stop offset="70%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>

        {/* Arc Reactor Cyan Glow Gradient */}
        <linearGradient id="arcGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#67e8f9" />
          <stop offset="80%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Visor Eye Glow Filter */}
        <filter id="ironEyeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Arc Reactor Radial Filter */}
        <filter id="arcCoreGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Armor 3D Shadow */}
        <filter id="ironShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Background Aura */}
      {isCelebrating && (
        <circle cx="60" cy="60" r="54" fill="none" stroke="#06b6d4" strokeWidth="3.5" opacity="0.9" className="char-arc-glow" />
      )}
      {isThinking && (
        <circle cx="60" cy="60" r="52" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 6" opacity="0.85" className="animate-spin" style={{ animationDuration: '6s' }} />
      )}

      {/* Torso & Armored Chestplate */}
      <g filter="url(#ironShadow)">
        {/* Crimson Shoulder Plates */}
        <path
          d="M 20 92 C 24 82 42 78 48 82 L 52 120 L 14 120 C 14 108 16 98 20 92 Z"
          fill="url(#ironCrimson)"
        />
        <path
          d="M 100 92 C 96 82 78 78 72 82 L 68 120 L 106 120 C 106 108 104 98 100 92 Z"
          fill="url(#ironCrimson)"
        />

        {/* Center Chest Armor (Beveled Crimson & Gold Inset) */}
        <path d="M 46 80 L 74 80 L 80 120 L 40 120 Z" fill="url(#ironCrimson)" />
        {/* Gold Clavicle Accents */}
        <polygon points="36,84 48,82 52,86 40,88" fill="url(#ironGold)" />
        <polygon points="84,84 72,82 68,86 80,88" fill="url(#ironGold)" />

        {/* Arc Reactor Housing (Chest Core) */}
        <circle cx="60" cy="98" r="14" fill="#0f172a" stroke="#ca8a04" strokeWidth="1.5" />
        <circle cx="60" cy="98" r="11" fill="#1e293b" stroke="#06b6d4" strokeWidth="1" />

        {/* Pulsing Arc Reactor Core */}
        <g className={isDisappointed ? '' : 'char-arc-glow'} filter="url(#arcCoreGlow)">
          <polygon
            points="60,89 68,103 52,103"
            fill={isDisappointed ? '#475569' : 'url(#arcGlow)'}
            stroke="#ffffff"
            strokeWidth="0.8"
          />
          <circle cx="60" cy="98" r="4.5" fill={isDisappointed ? '#334155' : '#ffffff'} />
        </g>
        {/* Radial power channels */}
        <line x1="60" y1="87" x2="60" y2="91" stroke="#38bdf8" strokeWidth="1.2" />
        <line x1="50" y1="104" x2="53" y2="101" stroke="#38bdf8" strokeWidth="1.2" />
        <line x1="70" y1="104" x2="67" y2="101" stroke="#38bdf8" strokeWidth="1.2" />
      </g>

      {/* Neck Segment (Black Flex-Armor with Gold Bars) */}
      <rect x="52" y="68" width="16" height="14" rx="2" fill="#0f172a" />
      <line x1="54" y1="72" x2="66" y2="72" stroke="url(#ironGold)" strokeWidth="1.2" />
      <line x1="54" y1="76" x2="66" y2="76" stroke="url(#ironGold)" strokeWidth="1.2" />

      {/* Helmet Base */}
      <g id="ironHelmet" filter="url(#ironShadow)">
        {/* Outer Crimson Helmet Shell */}
        <path
          d="M 36 46 C 36 30 45 20 60 20 C 75 20 84 30 84 46 C 84 62 77 74 60 75 C 43 74 36 62 36 46 Z"
          fill="url(#ironCrimson)"
        />

        {/* Helmet Ear Pods (Cylindrical Gold Accents) */}
        <rect x="33" y="46" width="5" height="12" rx="2" fill="url(#ironGold)" stroke="#78350f" strokeWidth="0.5" />
        <rect x="82" y="46" width="5" height="12" rx="2" fill="url(#ironGold)" stroke="#78350f" strokeWidth="0.5" />

        {/* Top Brow Shell Accents */}
        <path d="M 44 26 Q 60 22 76 26 L 74 32 Q 60 29 46 32 Z" fill="url(#ironGold)" opacity="0.6" />

        {/* Gold Faceplate (Angular Hero Silhouette) */}
        <path
          d="M 41 38 C 45 32 54 31 60 31 C 66 31 75 32 79 38 L 78 55 C 77 64 71 70 60 71 C 49 70 43 64 42 55 Z"
          fill="url(#ironGold)"
          stroke="#854d0e"
          strokeWidth="1.2"
        />

        {/* Angular Cheekbone Cuts & Seams */}
        <path d="M 42 48 L 50 51 L 43 60" stroke="#78350f" strokeWidth="1.2" fill="none" />
        <path d="M 78 48 L 70 51 L 77 60" stroke="#78350f" strokeWidth="1.2" fill="none" />

        {/* Mouth Aperture / Slit */}
        {isSpeaking ? (
          <g>
            <rect x="52" y="62" width="16" height="3" rx="1" fill="#0f172a" />
            <rect x="53" y="62.5" width="14" height="2" rx="0.8" fill="#38bdf8" className="animate-pulse" />
          </g>
        ) : (
          <path d="M 52 63 L 60 64 L 68 63" stroke="#78350f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        )}

        {/* Visor Eye Slots (Angular, Illuminated Cyan Glow) */}
        {/* Left Visor Eye */}
        <g filter={isDisappointed ? undefined : 'url(#ironEyeGlow)'}>
          <polygon
            points="45,46 56,47 55,50 46,49"
            fill={isDisappointed ? '#334155' : '#ffffff'}
            stroke={isDisappointed ? '#475569' : '#06b6d4'}
            strokeWidth="1"
            className={isDisappointed ? undefined : 'char-arc-glow'}
          />
          {/* Right Visor Eye */}
          <polygon
            points="75,46 64,47 65,50 74,49"
            fill={isDisappointed ? '#334155' : '#ffffff'}
            stroke={isDisappointed ? '#475569' : '#06b6d4'}
            strokeWidth="1"
            className={isDisappointed ? undefined : 'char-arc-glow'}
          />
        </g>

        {/* Thinking HUD Scan Line */}
        {isThinking && (
          <g opacity="0.8">
            <line x1="44" y1="48" x2="76" y2="48" stroke="#38bdf8" strokeWidth="1.5" className="animate-pulse" />
            <circle cx="60" cy="48" r="1.5" fill="#ffffff" />
          </g>
        )}
      </g>

      {/* Celebration Energy Shockwave */}
      {isCelebrating && (
        <g className="char-sparkle-active">
          <polygon points="60,4 63,11 70,11 64,15 67,22 60,17 53,22 56,15 50,11 57,11" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.5" />
          <polygon points="20,22 22,25 25,25 23,27 24,30 20,28 16,30 17,27 15,25 18,25" fill="#22d3ee" />
          <polygon points="100,22 102,25 105,25 103,27 104,30 100,28 96,30 97,27 95,25 98,25" fill="#22d3ee" />
        </g>
      )}

      {/* Disappointed HUD Error Steam */}
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

