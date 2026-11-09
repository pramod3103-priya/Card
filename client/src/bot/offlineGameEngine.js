/**
 * Offline Game Engine for PRO CARD vs Bots
 * Self-contained client-side logic for offline gameplay.
 */

const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_ORDER = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

const SUIT_ORDER = {
  'Spades': 4,
  'Hearts': 3,
  'Diamonds': 2,
  'Clubs': 1,
};

export function createStandardDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `${suit[0]}-${rank}`,
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sortHand(hand) {
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) {
      return (SUIT_ORDER[b.suit] || 0) - (SUIT_ORDER[a.suit] || 0);
    }
    return (RANK_ORDER[b.rank] || 0) - (RANK_ORDER[a.rank] || 0);
  });
}

/**
 * Splits 52 cards into 3 progressive dealing batches:
 * Batch 1: 5 cards each (20 cards)
 * Batch 2: 4 cards each (16 cards)
 * Batch 3: 4 cards each (16 cards)
 */
export function dealProgressiveBatches(deck) {
  const batch1 = [[], [], [], []];
  const batch2 = [[], [], [], []];
  const batch3 = [[], [], [], []];

  let cardIdx = 0;

  // Batch 1: 5 cards per seat
  for (let round = 0; round < 5; round++) {
    for (let seat = 0; seat < 4; seat++) {
      batch1[seat].push(deck[cardIdx++]);
    }
  }

  // Batch 2: 4 cards per seat
  for (let round = 0; round < 4; round++) {
    for (let seat = 0; seat < 4; seat++) {
      batch2[seat].push(deck[cardIdx++]);
    }
  }

  // Batch 3: 4 cards per seat
  for (let round = 0; round < 4; round++) {
    for (let seat = 0; seat < 4; seat++) {
      batch3[seat].push(deck[cardIdx++]);
    }
  }

  return { batch1, batch2, batch3 };
}

