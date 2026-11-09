/**
 * 4 Playable Characters for PRO CARD: Offline vs Bots
 * 
 * Gameplay Rule:
 * The human player selects ONLY ONE character.
 * The remaining THREE characters automatically become AI-controlled BOT opponents.
 */

export const PLAYABLE_CHARACTERS = [
  {
    id: 'odi',
    name: 'ODI',
    tagline: 'The Master Strategist',
    inspiration: 'Inspired by Narendra Modi',
    bio: 'Patient, visionary diplomat. Plays calculated bids, stays disciplined under pressure, and strikes when the odds are in his favor.',
    themeColor: '#f97316', // Saffron / Warm Orange
    secondaryColor: '#ea580c',
    badgeClass: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
    avatarGradient: 'from-amber-600 via-orange-500 to-yellow-500',
    ringColor: 'ring-orange-500/80',
    initials: 'OD',
    flagEmoji: '🇮🇳',
    styleLabel: 'Strategic & Disciplined',
    favoriteTrump: 'Diamonds',
    aggression: 0.55,
    quips: {
      intro: 'Mitron, patience and calculated strategy build grand victories!',
      bid: 'A measured step forward. I bid {amount}.',
      pass: 'Strategic patience is also a move. I pass.',
      winAuction: 'The trust of the table is secured! Pradhan is {suit}.',
      allPassed: 'Spades is the default order. Let us proceed.',
    },
  },
  {
    id: 'putin',
    name: 'Put-in',
    tagline: 'The Cold Tactician',
    inspiration: 'Inspired by Vladimir Putin',
    bio: 'Stoic judo master and tactical realist. Fearless in auction battles, bids boldly on strong suits, and commands Spades with iron resolve.',
    themeColor: '#0284c7', // Steel Blue
    secondaryColor: '#1e3a8a',
    badgeClass: 'bg-sky-500/20 border-sky-500/50 text-sky-300',
    avatarGradient: 'from-slate-700 via-sky-700 to-blue-900',
    ringColor: 'ring-sky-500/80',
    initials: 'PI',
    flagEmoji: '🇷🇺',
    styleLabel: 'Bold & Dominant',
    favoriteTrump: 'Spades',
    aggression: 0.75,
    quips: {
      intro: 'In cards, as in chess, victory belongs to the unyielding.',
      bid: 'No hesitation. The bid is {amount}.',
      pass: 'Power held in reserve. I pass.',
      winAuction: 'Total tactical dominance. The trump suit is {suit}.',
      allPassed: 'Spades rule as expected.',
    },
  },
  {
    id: 'trampu',
    name: 'Trampu',
    tagline: 'The Grand Dealmaker',
    inspiration: 'Inspired by Donald Trump',
    bio: 'Flamboyant, high-stakes billionaire dealmaker. Loves opening high, escalating the auction, and making dramatic trump calls.',
    themeColor: '#eab308', // Gold / Amber
    secondaryColor: '#b45309',
    badgeClass: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
    avatarGradient: 'from-yellow-400 via-amber-500 to-red-600',
    ringColor: 'ring-yellow-400/80',
    initials: 'TR',
    flagEmoji: '🇺🇸',
    styleLabel: 'High-Stakes & Aggressive',
    favoriteTrump: 'Hearts',
    aggression: 0.85,
    quips: {
      intro: "Nobody plays cards better than me, believe me, it's gonna be huge!",
      bid: 'Tremendous bid! We go all the way to {amount}!',
      pass: 'Bad deal, totally unfair! I pass.',
      winAuction: 'A monumental victory, the greatest auction in history! Trump is {suit}!',
      allPassed: 'Spades default? We still win big, believe me.',
    },
  },
  {
    id: 'ironman',
    name: 'Iron Man',
    tagline: 'The High-Tech Genius',
    inspiration: 'Marvel superhero-inspired',
    bio: 'Armored Avenger powered by J.A.R.V.I.S. analytics. Calculates expected trick probabilities, outwits opponents with witty quips, and adapts in real time.',
    themeColor: '#dc2626', // Crimson & Arc Gold
    secondaryColor: '#f59e0b',
    badgeClass: 'bg-rose-500/20 border-rose-500/50 text-rose-300',
    avatarGradient: 'from-red-600 via-rose-600 to-amber-500',
    ringColor: 'ring-rose-500/80',
    initials: 'IM',
    flagEmoji: '⚡',
    styleLabel: 'Analytical & Adaptive',
    favoriteTrump: 'Clubs',
    aggression: 0.65,
    quips: {
      intro: 'J.A.R.V.I.S., run card diagnostics. Sometimes you gotta run before you can walk.',
      bid: 'Calculated odds at 87.4%. Bidding {amount}.',
      pass: 'Conserving arc reactor energy. Passing this round.',
      winAuction: 'Arc reactor at 100%. Selecting {suit} as Trump!',
      allPassed: 'Default protocol engaged: Spades.',
    },
  },
];

/**
 * Given the human player's chosen character ID:
 * Automatically returns the human character and the 3 remaining AI opponents.
 * Never asks user to choose all 4.
 *
 * @param {string} chosenId - 'odi' | 'putin' | 'trampu' | 'ironman'
 * @returns {{ humanCharacter: object, botOpponents: object[], allSeats: object[] }}
 */
export function assignOfflineSeats(chosenId) {
  const human = PLAYABLE_CHARACTERS.find((c) => c.id === chosenId) || PLAYABLE_CHARACTERS[0];
  const bots = PLAYABLE_CHARACTERS.filter((c) => c.id !== human.id);

  // 4 Table Seats:
  // Seat 0: South (Human Player)
  // Seat 1: West (Bot 1)
  // Seat 2: North (Bot 2)
  // Seat 3: East (Bot 3)
  const allSeats = [
    {
      seatIndex: 0,
      position: 'bottom',
      seatName: 'South',
      isHuman: true,
      character: human,
    },
    {
      seatIndex: 1,
      position: 'left',
      seatName: 'West',
      isHuman: false,
      character: bots[0],
    },
    {
      seatIndex: 2,
      position: 'top',
      seatName: 'North',
      isHuman: false,
      character: bots[1],
    },
    {
      seatIndex: 3,
      position: 'right',
      seatName: 'East',
      isHuman: false,
      character: bots[2],
    },
  ];

  return {
    humanCharacter: human,
    botOpponents: bots,
    allSeats,
  };
}

