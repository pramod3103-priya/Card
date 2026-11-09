/**
 * PRO CARD – PRADHAN (TRUMP SUIT) CONFIGURATION
 * 
 * Configurable metadata for the four suits of a standard 52-card deck.
 * Established local Hindi and Latin suit names.
 */

export const PRADHAN_SUITS = [
  {
    suit: 'Hearts',
    symbol: '♥',
    hindiName: 'लाल पान',
    latinName: 'LAAL PAAN',
    label: 'लाल पान – LAAL PAAN',
    isRed: true,
    accentColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.45)',
  },
  {
    suit: 'Diamonds',
    symbol: '♦',
    hindiName: 'ईंट',
    latinName: 'EENT',
    label: 'ईंट – EENT',
    isRed: true,
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.45)',
  },
  {
    suit: 'Clubs',
    symbol: '♣',
    hindiName: 'चीड़ी',
    latinName: 'CHIDI',
    label: 'चीड़ी – CHIDI',
    isRed: false,
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
  },
  {
    suit: 'Spades',
    symbol: '♠',
    hindiName: 'हुकुम',
    latinName: 'HUKUM',
    label: 'हुकुम – HUKUM',
    isRed: false,
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.45)',
  },
];

/**
 * Normalizes input string to canonical suit name: 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades'
 * Accepts English names, Hindi names, Latin transliterations, or single-letter codes.
 * @param {string} input
 * @returns {string|null}
 */
export function normalizeSuit(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().toLowerCase();

  // Hearts
  if (
    clean === 'hearts' || clean === 'heart' || clean === 'h' ||
    clean === 'laal paan' || clean === 'laalpaan' || clean === 'लाल पान' || clean === 'लालपान' ||
    clean.includes('laal paan') || clean.includes('hearts') || clean.includes('लाल पान')
  ) {
    return 'Hearts';
  }

  // Diamonds
  if (
    clean === 'diamonds' || clean === 'diamond' || clean === 'd' ||
    clean === 'eent' || clean === 'int' || clean === 'ईंट' || clean === 'ईट' ||
    clean.includes('eent') || clean.includes('diamonds') || clean.includes('ईंट')
  ) {
    return 'Diamonds';
  }

  // Clubs
  if (
    clean === 'clubs' || clean === 'club' || clean === 'c' ||
    clean === 'chidi' || clean === 'chiri' || clean === 'चीड़ी' || clean === 'चिड़ी' ||
    clean.includes('chidi') || clean.includes('clubs') || clean.includes('चीड़ी')
  ) {
    return 'Clubs';
  }

  // Spades
  if (
    clean === 'spades' || clean === 'spade' || clean === 's' ||
    clean === 'hukum' || clean === 'hukam' || clean === 'हुकुम' || clean === 'हुकम' ||
    clean.includes('hukum') || clean.includes('spades') || clean.includes('हुकुम')
  ) {
    return 'Spades';
  }

  // Fallback title-case capitalization
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

