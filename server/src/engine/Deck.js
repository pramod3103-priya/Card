import crypto from 'crypto';

export const SUITS = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_VALUES = {
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

// Suit order for sorting hands (Spades, Hearts, Clubs, Diamonds)
export const SUIT_ORDER = {
  SPADES: 1,
  HEARTS: 2,
  CLUBS: 3,
  DIAMONDS: 4,
};

/**
 * Creates a standard 52-card deck.
 * @returns {Array<{ id: string, suit: string, rank: string, value: number }>}
 */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit.charAt(0)}-${rank}`,
        suit,
        rank,
        value: RANK_VALUES[rank],
      });
    }
  }
  return deck;
}

/**
 * Cryptographically secure Fisher-Yates shuffle.
 * @param {Array} cards
 * @returns {Array} A new shuffled array
 */
export function shuffleDeck(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Sorts a player hand by suit and descending rank.
 * @param {Array} hand
 * @returns {Array}
 */
export function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const suitDiff = (SUIT_ORDER[a.suit] || 0) - (SUIT_ORDER[b.suit] || 0);
    if (suitDiff !== 0) return suitDiff;
    return b.value - a.value; // Higher rank first (A -> 2)
  });
}

/**
 * Deals 13 cards to each of the 4 players (standard deal).
 * @param {Array} deck 52-card deck
 * @returns {Array<Array>} 4 arrays of 13 cards each
 */
export function dealHands(deck) {
  if (!deck || deck.length !== 52) {
    throw new Error('Deck must contain exactly 52 cards to deal 4 hands of 13.');
  }

  const hands = [[], [], [], []];
  for (let i = 0; i < deck.length; i++) {
    hands[i % 4].push(deck[i]);
  }

  for (let seat = 0; seat < 4; seat++) {
    hands[seat] = sortHand(hands[seat]);
  }

  return hands;
}

/**
 * Splits a shuffled 52-card deck into the three MINUS dealing batches:
 * Batch 1: 5 cards per player (20 cards total)
 * Batch 2: 4 cards per player (16 cards total -> 9 cards total)
 * Batch 3: 4 cards per player (16 cards total -> 13 cards total)
 * @param {Array} deck
 */
export function dealPhasedBatches(deck) {
  if (!deck || deck.length !== 52) {
    throw new Error('Deck must contain exactly 52 cards.');
  }

  const batch1 = [[], [], [], []]; // 5 cards each (20 cards)
  const batch2 = [[], [], [], []]; // 4 cards each (16 cards)
  const batch3 = [[], [], [], []]; // 4 cards each (16 cards)

  let cursor = 0;

  // 1. Deal 5 cards to each player (round-robin)
  for (let round = 0; round < 5; round++) {
    for (let seat = 0; seat < 4; seat++) {
      batch1[seat].push(deck[cursor++]);
    }
  }

  // 2. Deal 4 cards to each player
  for (let round = 0; round < 4; round++) {
    for (let seat = 0; seat < 4; seat++) {
      batch2[seat].push(deck[cursor++]);
    }
  }

  // 3. Deal final 4 cards to each player
  for (let round = 0; round < 4; round++) {
    for (let seat = 0; seat < 4; seat++) {
      batch3[seat].push(deck[cursor++]);
    }
  }

  return { batch1, batch2, batch3 };
}
