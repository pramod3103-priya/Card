/**
 * PRO CARD – PRADHAN (TRUMP SUIT) CLIENT CONFIGURATION
 * 
 * Established suit names and visual tokens for the four standard suits.
 * Configurable metadata: Hindi name, Latin transliteration, card symbols,
 * Chess-inspired gray theme palettes, and glowing effects.
 */

export const PRADHAN_SUITS = [
  {
    suit: 'Hearts',
    symbol: '♥',
    hindiName: 'लाल पान',
    latinName: 'LAAL PAAN',
    label: 'लाल पान – LAAL PAAN',
    isRed: true,
    totalCards: 13,
    colorClass: 'text-rose-500',
    borderClass: 'border-rose-500/80',
    selectedBorder: 'border-rose-500 ring-4 ring-rose-500/50',
    bgGradient: 'from-rose-950/40 via-zinc-900 to-zinc-950',
    glowColor: 'rgba(244, 63, 94, 0.45)',
    glowBoxShadow: '0 0 25px rgba(244, 63, 94, 0.4)',
    accentBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: '13 Cards • Red Hearts',
  },
  {
    suit: 'Diamonds',
    symbol: '♦',
    hindiName: 'ईंट',
    latinName: 'EENT',
    label: 'ईंट – EENT',
    isRed: true,
    totalCards: 13,
    colorClass: 'text-amber-500',
    borderClass: 'border-amber-500/80',
    selectedBorder: 'border-amber-500 ring-4 ring-amber-500/50',
    bgGradient: 'from-amber-950/40 via-zinc-900 to-zinc-950',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    glowBoxShadow: '0 0 25px rgba(245, 158, 11, 0.4)',
    accentBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: '13 Cards • Red Diamonds',
  },
  {
    suit: 'Clubs',
    symbol: '♣',
    hindiName: 'चीड़ी',
    latinName: 'CHIDI',
    label: 'चीड़ी – CHIDI',
    isRed: false,
    totalCards: 13,
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/80',
    selectedBorder: 'border-emerald-500 ring-4 ring-emerald-500/50',
    bgGradient: 'from-emerald-950/40 via-zinc-900 to-zinc-950',
    glowColor: 'rgba(52, 211, 153, 0.45)',
    glowBoxShadow: '0 0 25px rgba(52, 211, 153, 0.4)',
    accentBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: '13 Cards • Black Clubs',
  },
  {
    suit: 'Spades',
    symbol: '♠',
    hindiName: 'हुकुम',
    latinName: 'HUKUM',
    label: 'हुकुम – HUKUM',
    isRed: false,
    totalCards: 13,
    colorClass: 'text-sky-400',
    borderClass: 'border-sky-500/80',
    selectedBorder: 'border-sky-500 ring-4 ring-sky-500/50',
    bgGradient: 'from-sky-950/40 via-zinc-900 to-zinc-950',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    glowBoxShadow: '0 0 25px rgba(56, 189, 248, 0.4)',
    accentBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    description: '13 Cards • Black Spades',
  },
];

/**
 * Normalizes input string to canonical suit name: 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades'
 */
export function normalizeSuit(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().toLowerCase();

  if (
    clean === 'hearts' || clean === 'heart' || clean === 'h' ||
    clean === 'laal paan' || clean === 'laalpaan' || clean === 'लाल पान' || clean === 'लालपान' ||
    clean.includes('laal paan') || clean.includes('hearts') || clean.includes('लाल पान')
  ) {
    return 'Hearts';
  }

  if (
    clean === 'diamonds' || clean === 'diamond' || clean === 'd' ||
    clean === 'eent' || clean === 'int' || clean === 'ईंट' || clean === 'ईट' ||
    clean.includes('eent') || clean.includes('diamonds') || clean.includes('ईंट')
  ) {
    return 'Diamonds';
  }

  if (
    clean === 'clubs' || clean === 'club' || clean === 'c' ||
    clean === 'chidi' || clean === 'chiri' || clean === 'चीड़ी' || clean === 'चिड़ी' ||
    clean.includes('chidi') || clean.includes('clubs') || clean.includes('चीड़ी')
  ) {
    return 'Clubs';
  }

  if (
    clean === 'spades' || clean === 'spade' || clean === 's' ||
    clean === 'hukum' || clean === 'hukam' || clean === 'हुकुम' || clean === 'हुकम' ||
    clean.includes('hukum') || clean.includes('spades') || clean.includes('हुकुम')
  ) {
    return 'Spades';
  }

  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
  if (['Hearts', 'Diamonds', 'Clubs', 'Spades'].includes(capitalized)) {
    return capitalized;
  }

  return null;
}

/**
 * Retrieves the full Pradhan config for any suit.
 * @param {string} suit
 * @returns {typeof PRADHAN_SUITS[0]}
 */
export function getPradhanSuitConfig(suit) {
  const norm = normalizeSuit(suit) || 'Spades';
  return PRADHAN_SUITS.find((s) => s.suit === norm) || PRADHAN_SUITS[3];
}

