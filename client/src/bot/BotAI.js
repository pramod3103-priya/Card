/**
 * Realistic Personality-Driven Bot AI Decision Engine for PRO CARD
 *
 * Each character has distinct playing styles, bidding aggressiveness,
 * suit preferences, and signature dialogue quips.
 */

const SUIT_NAMES = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];

const RANK_VALUES = {
  'A': 4.0,
  'K': 3.0,
  'Q': 2.0,
  'J': 1.0,
  '10': 0.75,
  '9': 0.5,
  '8': 0.25,
  '7': 0,
  '6': 0,
  '5': 0,
  '4': 0,
  '3': 0,
  '2': 0,
};

/**
 * Evaluates a player's hand strength.
 * Considers high card points (HCP) and suit distribution lengths.
 *
 * @param {Array} hand - Array of cards [{ suit, rank }]
 * @returns {{ hcp: number, suitCounts: object, suitPoints: object, totalScore: number, bestSuit: string }}
 */
export function evaluateHand(hand = []) {
  let hcp = 0;
  const suitCounts = { Spades: 0, Hearts: 0, Diamonds: 0, Clubs: 0 };
  const suitPoints = { Spades: 0, Hearts: 0, Diamonds: 0, Clubs: 0 };

  for (const card of hand) {
    if (!card) continue;
    const suit = card.suit;
    const rank = card.rank;
    const pts = RANK_VALUES[rank] || 0;

    hcp += pts;
    if (suitCounts[suit] !== undefined) {
      suitCounts[suit] += 1;
      suitPoints[suit] += pts;
    }
  }

  // Distribution bonuses: long suits provide trick-taking potential
  let lengthBonus = 0;
  let bestSuit = 'Spades';
  let bestSuitMetric = -1;

  for (const suit of SUIT_NAMES) {
    const count = suitCounts[suit];
    const pts = suitPoints[suit];
    if (count >= 3) lengthBonus += (count - 2) * 1.5;

    // Combined metric: 1.5 * count + points in suit
    const metric = count * 2.0 + pts;
    if (metric > bestSuitMetric) {
      bestSuitMetric = metric;
      bestSuit = suit;
    }
  }

  const totalScore = hcp + lengthBonus;

  return {
    hcp,
    suitCounts,
    suitPoints,
    totalScore,
    bestSuit,
  };
}

/**
 * Calculates a bot's bidding decision based on hand strength, stage,
 * current highest bid, minimum next bid, and personality traits.
 *
 * @param {object} character - Bot character profile (ODI, Put-in, Trampu, Iron Man)
 * @param {Array} hand - Bot's private hand
 * @param {string} stage - 'first_bidding' | 'second_bidding' | 'final_bidding'
 * @param {number|null} highestBid - Current highest bid in room
 * @param {number} minNextBid - Minimum next valid bid
 * @param {number} maxBid - Maximum allowable bid (13)
 * @returns {{ action: 'bid'|'pass', amount: number|null, quip: string }}
 */
export function decideBotBid(character, hand = [], stage, highestBid, minNextBid, maxBid = 13) {
  const evalResult = evaluateHand(hand);
  const { totalScore } = evalResult;

  // Personality aggression modifier
  const aggression = character.aggression || 0.6;
  const effectiveScore = totalScore * (0.85 + aggression * 0.3);

  // Determine stage capability thresholds
  // Stage 1 (5 cards): Max score ~ 15. Opening bid threshold: ~6.0 score for bid 5
  // Stage 2 (9 cards): Max score ~ 25. Bid 8 threshold: ~12.0 score
  // Stage 3 (13 cards): Max score ~ 35. Bid 10 threshold: ~18.0 score
  let maxWillingBid = 0;

  if (stage === 'first_bidding') {
    if (effectiveScore >= 6.0) maxWillingBid = 5;
    if (effectiveScore >= 8.5) maxWillingBid = 6;
    if (effectiveScore >= 11.0 && aggression > 0.7) maxWillingBid = 7;
  } else if (stage === 'second_bidding') {
    if (effectiveScore >= 11.0) maxWillingBid = 8;
    if (effectiveScore >= 14.5) maxWillingBid = 9;
    if (effectiveScore >= 18.0 && aggression > 0.7) maxWillingBid = 10;
  } else {
    // final_bidding
    if (effectiveScore >= 16.5) maxWillingBid = 10;
    if (effectiveScore >= 20.0) maxWillingBid = 11;
    if (effectiveScore >= 24.0) maxWillingBid = 12;
    if (effectiveScore >= 28.0 && aggression > 0.8) maxWillingBid = 13;
  }

  // If character is Trampu, add high-stakes boldness chance
  if (character.id === 'trampu' && Math.random() < 0.25 && maxWillingBid < minNextBid && minNextBid <= 10) {
    maxWillingBid = minNextBid;
  }

  // If character is Put-in and holds strong Spades, boost willingness
  if (character.id === 'putin' && evalResult.suitPoints['Spades'] >= 6.0) {
    maxWillingBid = Math.max(maxWillingBid, minNextBid);
  }

  // Decide between Bid or Pass
  if (maxWillingBid >= minNextBid && minNextBid <= maxBid) {
    const bidAmount = minNextBid;
    const template = character.quips?.bid || 'I bid {amount}.';
    const quip = template.replace('{amount}', bidAmount);
    return {
      action: 'bid',
      amount: bidAmount,
      quip,
    };
  }

  // Otherwise, pass
  const passQuip = character.quips?.pass || 'I pass.';
  return {
    action: 'pass',
    amount: null,
    quip: passQuip,
  };
}

/**
 * Chooses the Pradhan / Trump suit for a winning bot.
 * Picks the suit with highest length and power, with a fallback tiebreaker to favoriteTrump.
 *
 * @param {object} character - Winning bot character
 * @param {Array} hand - Bot's 13-card hand
 * @returns {{ suit: string, quip: string }}
 */
export function decideBotTrump(character, hand = []) {
  const evalResult = evaluateHand(hand);
  let chosenSuit = evalResult.bestSuit;

  // If close tie, character prefers favoriteTrump
  if (character.favoriteTrump) {
    const favCount = evalResult.suitCounts[character.favoriteTrump] || 0;
    const bestCount = evalResult.suitCounts[chosenSuit] || 0;
    if (favCount >= bestCount - 1 && favCount >= 3) {
      chosenSuit = character.favoriteTrump;
    }
  }

  const template = character.quips?.winAuction || 'Trump is {suit}!';
  const quip = template.replace('{suit}', chosenSuit);

  return {
    suit: chosenSuit,
    quip,
  };
}

/**
 * Decision engine for the special PRO CARD Flexible Bid Increase Phase:
 * Triggered when all 4 players have bid 10.
 *
 * Rules:
 * - Each player independently chooses whether to increase their bid or PASS.
 * - An increase can be ANY amount: e.g. 10 -> 11, 10 -> 12, 10 -> 13, 10 -> 15.
 * - Not restricted to +1.
 * - Bids are strictly independent (no requirement to match or exceed other players).
 *
 * @param {object} character - Bot profile (ODI, Put-in, Trampu, Iron Man)
 * @param {Array} hand - Bot's private 13-card hand
 * @param {number} currentBid - Current baseline bid (default 10)
 * @returns {{ action: 'increase'|'pass', amount: number, quip: string }}
 */
export function decideBotFlexibleIncrease(character, hand = [], currentBid = 10) {
  const evalResult = evaluateHand(hand);
  const { totalScore } = evalResult;
  const aggression = character.aggression || 0.6;
  const effectiveScore = totalScore * (0.85 + aggression * 0.3);

  // Character specific decision styles
  if (character.id === 'trampu') {
    // Grand Dealmaker: High tendency to increase boldly by non-+1 amounts (e.g. 13 or 15)
    if (effectiveScore >= 16 || Math.random() < 0.6) {
      const jumpAmount = effectiveScore >= 22 ? 15 : 13;
      return {
        action: 'increase',
        amount: jumpAmount,
        quip: `Huge deal! I'm independently increasing my bid from 10 to ${jumpAmount}! Believe me!`,
      };
    }
  } else if (character.id === 'putin') {
    // Cold Tactician: Strong escalation if holds strong Spades or high HCP
    const hasSpadePower = evalResult.suitPoints['Spades'] >= 5.0;
    if (effectiveScore >= 18 || hasSpadePower) {
      const jumpAmount = hasSpadePower && effectiveScore >= 21 ? 13 : 12;
      return {
        action: 'increase',
        amount: jumpAmount,
        quip: `Calculated tactical escalation. Increasing my personal bid to ${jumpAmount}.`,
      };
    }
  } else if (character.id === 'ironman') {
    // High-Tech Genius: Probability modeling
    if (effectiveScore >= 18) {
      const jumpAmount = effectiveScore >= 21 ? 13 : 11;
      return {
        action: 'increase',
        amount: jumpAmount,
        quip: `J.A.R.V.I.S. simulated trick trajectories. Upgrading independent bid to ${jumpAmount}.`,
      };
    }
  } else {
    // ODI: The Master Strategist - disciplined, patient
    if (effectiveScore >= 20) {
      return {
        action: 'increase',
        amount: 11,
        quip: 'A measured, strategic increase. Stepping my bid forward to 11.',
      };
    }
  }

  // Pass (Keep at 10)
  return {
    action: 'pass',
    amount: currentBid,
    quip: character.id === 'odi'
      ? 'Strategic patience. I pass and comfortably hold my bid at 10.'
      : 'Holding at 10. Pass.',
  };
}
