import React, { useState, useEffect, useRef } from 'react';
import { assignOfflineSeats } from '../data/characters';
import { decideBotBid, decideBotTrump, decideBotFlexibleIncrease } from '../bot/BotAI';
import {
  createStandardDeck,
  shuffleDeck,
  sortHand,
  dealProgressiveBatches,
} from '../bot/offlineGameEngine';
import { PlayingCard } from './PlayingCard';
import { ScoreboardModal } from './ScoreboardModal';
import { MatchWinnerModal } from './MatchWinnerModal';
import { SettingsModal } from './SettingsModal';
import { AnimatedCharacterAvatar } from './character-avatars';
import { BiddingCountdownWidget } from './BiddingCountdownWidget';
import { PradhanAnnouncementOverlay } from './PradhanAnnouncementOverlay';
import { PradhanPinnedIndicator } from './PradhanPinnedIndicator';
import { PRADHAN_SUITS, getPradhanSuitConfig } from '../config/pradhanConfig';
import { useSoundSettings } from '../context/SoundSettingsContext';
import {
  ArrowLeft,
  Bot,
  User,
  Crown,
  Sparkles,
  Layers,
  ShieldCheck,
  Target,
  Trophy,
  Award,
  ChevronRight,
  RotateCcw,
  Volume2,
  VolumeX,
  TrendingUp,
  Zap,
  Settings,
} from 'lucide-react';

const STAGES = [
  { id: 'first_deal', step: 1, label: 'Deal 5', cards: 5 },
  { id: 'first_bidding', step: 2, label: 'Bid 1', cards: 5 },
  { id: 'second_deal', step: 3, label: 'Deal 9', cards: 9 },
  { id: 'second_bidding', step: 4, label: 'Bid 2', cards: 9 },
  { id: 'final_deal', step: 5, label: 'Deal 13', cards: 13 },
  { id: 'final_bidding', step: 6, label: 'Bid 3', cards: 13 },
  { id: 'ready_to_play', step: 7, label: 'Play', cards: 13 },
];

export const ProCardOfflineTable = ({ chosenCharacterId, gameTarget = 31, onExit }) => {
  const { humanCharacter, botOpponents, allSeats } = assignOfflineSeats(chosenCharacterId);

  // Game Engine State
  const [stage, setStage] = useState('first_deal');
  const [dealerSeatIndex, setDealerSeatIndex] = useState(0); // Dealer is Seat 0 initially
  const [batches, setBatches] = useState(null);
  const [playerHands, setPlayerHands] = useState([[], [], [], []]);
  const [selectedCardIdx, setSelectedCardIdx] = useState(null);

  // Bidding State
  const [highestBid, setHighestBid] = useState(null);
  const [highestBidderSeatIndex, setHighestBidderSeatIndex] = useState(null);
  const [winningBid, setWinningBid] = useState(null);
  const [winningBidderSeatIndex, setWinningBidderSeatIndex] = useState(null);
  const [currentBidderIndex, setCurrentBidderIndex] = useState(null);
  const [stageBidsCount, setStageBidsCount] = useState(0);
  const [stageComplete, setStageComplete] = useState(false);
  const [auctionComplete, setAuctionComplete] = useState(false);
  const [awaitingTrumpSelection, setAwaitingTrumpSelection] = useState(false);

  // Trump Suit (Pradhan)
  const [trumpSuit, setTrumpSuit] = useState(null);
  const [trumpSelectedBy, setTrumpSelectedBy] = useState(null);
  const [offlinePradhanAnnouncement, setOfflinePradhanAnnouncement] = useState(null);
  const [selectedPradhanSuit, setSelectedPradhanSuit] = useState('Hearts');

  // Bot Dialogues & Thinking State
  const [botDialogues, setBotDialogues] = useState({});
  const [thinkingBotName, setThinkingBotName] = useState(null);
  const [bidHistory, setBidHistory] = useState([]);

  // Human Bid Input State
  const [customBidAmount, setCustomBidAmount] = useState(5);

  // Independent Player Bids State: [Seat 0, Seat 1, Seat 2, Seat 3]
  const [playerBids, setPlayerBids] = useState([null, null, null, null]);

  // Flexible Bid Increase Rule State (Triggered when all 4 players have bid 10)
  const [isFlexibleIncreasePhase, setIsFlexibleIncreasePhase] = useState(false);
  const [flexibleTurnIndex, setFlexibleTurnIndex] = useState(null);
  const [flexibleIncreasesCount, setFlexibleIncreasesCount] = useState(0);
  const [flexibleResponses, setFlexibleResponses] = useState([null, null, null, null]);
  const [flexibleStepIndex, setFlexibleStepIndex] = useState(0);
  const [humanFlexibleAmount, setHumanFlexibleAmount] = useState(11);

  // 10-Second Countdown Timer State for Bidding
  const [biddingCountdown, setBiddingCountdown] = useState(10);
  const [timeUpPassed, setTimeUpPassed] = useState(false);
  const countdownTimerRef = useRef(null);

  // Trick-taking State for Stage 8
  const [trickCards, setTrickCards] = useState([null, null, null, null]);
  const [tricksWon, setTricksWon] = useState([0, 0, 0, 0]);
  const [lastTrickResult, setLastTrickResult] = useState(null);
  const [trickTurnIndex, setTrickTurnIndex] = useState(null);

  // Match Scores, History, & Modals State
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [roundHistory, setRoundHistory] = useState([]);
  const [trickHistory, setTrickHistory] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [matchOver, setMatchOver] = useState(false);
  const [matchWinnerSeatIndex, setMatchWinnerSeatIndex] = useState(null);
  const [showScoreboardModal, setShowScoreboardModal] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // PRO CARD Sound & Game Settings System
  const {
    settings,
    toggleMute,
    playDeal,
    playCardPlay,
    playBid,
    playTrump,
    playTrickWin,
    playVictory,
    playDefeat,
    playNotification,
    isSettingsOpen,
    openSettings,
    closeSettings,
  } = useSoundSettings();

  const timerRef = useRef(null);

  // Initialize Game on Mount
  useEffect(() => {
    initNewGame(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const initNewGame = (isFullReset = false) => {
    playDeal();
    if (isFullReset) {
      setScores([0, 0, 0, 0]);
      setRoundHistory([]);
      setTrickHistory([]);
      setCurrentRound(1);
      setMatchOver(false);
      setMatchWinnerSeatIndex(null);
      setShowWinnerModal(false);
      setShowScoreboardModal(false);
    }
    const rawDeck = createStandardDeck();
    const shuffled = shuffleDeck(rawDeck);
    const progressiveBatches = dealProgressiveBatches(shuffled);
    setBatches(progressiveBatches);

    // Initial Deal: 5 cards each
    const initialHands = progressiveBatches.batch1.map((h) => sortHand(h));
    setPlayerHands(initialHands);
    setStage('first_deal');
    setHighestBid(null);
    setHighestBidderSeatIndex(null);
    setWinningBid(null);
    setWinningBidderSeatIndex(null);
    setAuctionComplete(false);
    setAwaitingTrumpSelection(false);
    setTrumpSuit(null);
    setTrumpSelectedBy(null);
    setBidHistory([]);
    setBotDialogues({});
    setThinkingBotName(null);
    setPlayerBids([null, null, null, null]);
    setIsFlexibleIncreasePhase(false);
    setFlexibleTurnIndex(null);
    setFlexibleIncreasesCount(0);
    setFlexibleResponses([null, null, null, null]);
    setFlexibleStepIndex(0);
    setHumanFlexibleAmount(11);
    setTrickCards([null, null, null, null]);
    setTricksWon([0, 0, 0, 0]);
    setLastTrickResult(null);
    setTrickTurnIndex(null);

    // Auto-advance to first_bidding after deal animation
    setTimeout(() => {
      startBiddingStage('first_bidding');
    }, 1200);
  };

  // Clockwise Bidding Order: starts from (dealer + 1) % 4 and ends with Dealer
  const getBiddingOrder = (dealer = dealerSeatIndex) => {
    const firstBidder = (dealer + 1) % 4;
    return [
      firstBidder,
      (firstBidder + 1) % 4,
      (firstBidder + 2) % 4,
      dealer, // Dealer is ALWAYS last!
    ];
  };

  const startBiddingStage = (stageName) => {
    setStage(stageName);
    setStageBidsCount(0);
    setStageComplete(false);

    const order = getBiddingOrder();
    setCurrentBidderIndex(order[0]);
  };

  // Determine minimum next allowable bid
  const getMinOpeningBid = () => {
    if (stage === 'first_bidding') return 5;
    if (stage === 'second_bidding') return 8;
    return 10; // final_bidding
  };

  const getMinNextBid = () => {
    const minOpening = getMinOpeningBid();
    if (highestBid !== null) {
      return highestBid + 1;
    }
    return minOpening;
  };

  // Sync human bid input when min changes
  useEffect(() => {
    const nextMin = getMinNextBid();
    setCustomBidAmount(nextMin);
  }, [highestBid, stage]);

  // Execute Bot AI Turn when currentBidderIndex belongs to a Bot
  useEffect(() => {
    if (currentBidderIndex === null || stageComplete || auctionComplete) return;

    const activeSeat = allSeats[currentBidderIndex];
    if (!activeSeat || activeSeat.isHuman) return; // Human turn

    const botChar = activeSeat.character;
    setThinkingBotName(botChar.name);

    // Realistic thinking delay (800ms - 1300ms)
    timerRef.current = setTimeout(() => {
      setThinkingBotName(null);
      const minNext = getMinNextBid();
      const botHand = playerHands[currentBidderIndex] || [];

      const decision = decideBotBid(botChar, botHand, stage, highestBid, minNext, 13);

      // Display bot speech bubble
      setBotDialogues((prev) => ({
        ...prev,
        [currentBidderIndex]: decision.quip,
      }));

      if (decision.action === 'bid') {
        recordBid(currentBidderIndex, decision.amount, botChar.name);
      } else {
        recordPass(currentBidderIndex, botChar.name);
      }
    }, 950);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentBidderIndex, stageComplete, auctionComplete]);

  // Record Bid Action
  const recordBid = (seatIndex, amount, playerName) => {
    playBid();
    setHighestBid(amount);
    setHighestBidderSeatIndex(seatIndex);
    setPlayerBids((prev) => {
      const next = [...prev];
      next[seatIndex] = amount;
      return next;
    });
    setBidHistory((prev) => [
      ...prev,
      { stage, seatIndex, playerName, action: 'bid', amount },
    ]);
    advanceBiddingTurn(seatIndex);
  };

  // Record Pass Action
  const recordPass = (seatIndex, playerName) => {
    playBid();
    setBidHistory((prev) => [
      ...prev,
      { stage, seatIndex, playerName, action: 'pass' },
    ]);
    advanceBiddingTurn(seatIndex);
  };

  // Advance to next clockwise player
  const advanceBiddingTurn = (lastBidderIndex) => {
    setStageBidsCount((prevCount) => {
      const newCount = prevCount + 1;
      const order = getBiddingOrder();

      if (newCount < 4) {
        // Next clockwise bidder
        setCurrentBidderIndex(order[newCount]);
      } else {
        // Round complete: Dealer has had the last opportunity!
        setStageComplete(true);
        setCurrentBidderIndex(null);

        if (stage === 'final_bidding') {
          // Conclude Auction!
          setAuctionComplete(true);
          if (highestBidderSeatIndex !== null) {
            setWinningBid(highestBid);
            setWinningBidderSeatIndex(highestBidderSeatIndex);

            const winningSeat = allSeats[highestBidderSeatIndex];
            if (winningSeat.isHuman) {
              setAwaitingTrumpSelection(true);
            } else {
              // Bot selects Trump
              setTimeout(() => {
                const botDecision = decideBotTrump(
                  winningSeat.character,
                  playerHands[highestBidderSeatIndex]
                );
                const suitMeta = getPradhanSuitConfig(botDecision.suit);
                setTrumpSuit(suitMeta.suit);
                setTrumpSelectedBy(highestBidderSeatIndex);
                playTrump();
                setOfflinePradhanAnnouncement({
                  selectorName: winningSeat.character.name,
                  suit: suitMeta.suit,
                  suitLabel: suitMeta.label,
                  suitSymbol: suitMeta.symbol,
                  timestamp: Date.now(),
                });
                setBotDialogues((prev) => ({
                  ...prev,
                  [highestBidderSeatIndex]: botDecision.quip,
                }));
                setStage('ready_to_play');
              }, 1100);
            }
          } else {
            // "If everyone passes and no player wins the auction, Spades automatically becomes the default trump suit."
            setTrumpSuit('Spades');
            setTrumpSelectedBy('default_all_passed');
            setStage('ready_to_play');
          }
        }
      }
      return newCount;
    });
  };

  // Trigger special PRO CARD rule: when all 4 players have bid 10
  const triggerAllPlayersBid10 = () => {
    const all10 = [10, 10, 10, 10];
    setPlayerBids(all10);
    setHighestBid(10);
    setHighestBidderSeatIndex(0);
    setIsFlexibleIncreasePhase(true);
    setFlexibleIncreasesCount(0);
    setFlexibleResponses([null, null, null, null]);
    setFlexibleStepIndex(0);
    setStage('flexible_bid_increase');
    setStageComplete(false);
    setAuctionComplete(false);
    setAwaitingTrumpSelection(false);
    setCurrentBidderIndex(null);
    setBotDialogues({});

    const order = getBiddingOrder();
    setFlexibleTurnIndex(order[0]);
  };

  // Execute Bot AI Turn for Flexible Increase Phase
  useEffect(() => {
    if (!isFlexibleIncreasePhase || flexibleTurnIndex === null || auctionComplete) return;

    const activeSeat = allSeats[flexibleTurnIndex];
    if (!activeSeat || activeSeat.isHuman) return; // Human turn

    const botChar = activeSeat.character;
    setThinkingBotName(`${botChar.name} (deciding bid increase)`);

    timerRef.current = setTimeout(() => {
      setThinkingBotName(null);
      const botHand = playerHands[flexibleTurnIndex] || [];
      const decision = decideBotFlexibleIncrease(botChar, botHand, 10);

      // Display bot speech bubble
      setBotDialogues((prev) => ({
        ...prev,
        [flexibleTurnIndex]: decision.quip,
      }));

      if (decision.action === 'increase') {
        // Rule: Increase bid by ANY chosen amount (11, 12, 13, 15...)
        // Rule: If one player increases from 10 to 13, the other three players' bids remain at 10!
        setPlayerBids((prevBids) => {
          const nextBids = [...prevBids];
          nextBids[flexibleTurnIndex] = decision.amount;
          return nextBids;
        });
        setFlexibleIncreasesCount((c) => c + 1);
        setFlexibleResponses((prev) => {
          const next = [...prev];
          next[flexibleTurnIndex] = { action: 'increase', amount: decision.amount };
          return next;
        });
        setBidHistory((prev) => [
          ...prev,
          {
            stage: 'flexible_bid_increase',
            seatIndex: flexibleTurnIndex,
            playerName: botChar.name,
            action: 'increase',
            amount: decision.amount,
          },
        ]);
      } else {
        // Rule: Each player can independently choose to PASS (keeping bid at 10)
        setPlayerBids((prevBids) => {
          const nextBids = [...prevBids];
          nextBids[flexibleTurnIndex] = 10;
          return nextBids;
        });
        setFlexibleResponses((prev) => {
          const next = [...prev];
          next[flexibleTurnIndex] = { action: 'pass', amount: 10 };
          return next;
        });
        setBidHistory((prev) => [
          ...prev,
          {
            stage: 'flexible_bid_increase',
            seatIndex: flexibleTurnIndex,
            playerName: botChar.name,
            action: 'pass',
            amount: 10,
          },
        ]);
      }

      advanceFlexibleStep();
    }, 1100);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isFlexibleIncreasePhase, flexibleTurnIndex, auctionComplete]);

  // Advance clockwise during flexible increase phase
  const advanceFlexibleStep = () => {
    setFlexibleStepIndex((prevStep) => {
      const nextStep = prevStep + 1;
      const order = getBiddingOrder();

      if (nextStep < 4) {
        setFlexibleTurnIndex(order[nextStep]);
      } else {
        // All 4 players have answered!
        setFlexibleTurnIndex(null);
        setIsFlexibleIncreasePhase(false);
        finishFlexibleAuction();
      }
      return nextStep;
    });
  };

  // Conclude auction following flexible bid increase phase
  const finishFlexibleAuction = () => {
    setPlayerBids((currentBids) => {
      const anyIncreased = currentBids.some((b) => b !== null && b > 10);

      if (anyIncreased) {
        // Rule 8: "If at least one player increases their bid, continue the game."
        const maxBid = Math.max(...currentBids);
        const winningSeat = currentBids.indexOf(maxBid);

        setWinningBid(maxBid);
        setWinningBidderSeatIndex(winningSeat);
        setHighestBid(maxBid);
        setHighestBidderSeatIndex(winningSeat);
        setAuctionComplete(true);

        const winningSeatObj = allSeats[winningSeat];
        if (winningSeatObj.isHuman) {
          setAwaitingTrumpSelection(true);
        } else {
          // Bot selects Trump
          setTimeout(() => {
            const botTrumpDecision = decideBotTrump(
              winningSeatObj.character,
              playerHands[winningSeat]
            );
            const suitMeta = getPradhanSuitConfig(botTrumpDecision.suit);
            setTrumpSuit(suitMeta.suit);
            setTrumpSelectedBy(winningSeat);
            playTrump();
            setOfflinePradhanAnnouncement({
              selectorName: winningSeatObj.character.name,
              suit: suitMeta.suit,
              suitLabel: suitMeta.label,
              suitSymbol: suitMeta.symbol,
              timestamp: Date.now(),
            });
            setBotDialogues((prev) => ({
              ...prev,
              [winningSeat]: botTrumpDecision.quip,
            }));
            setStage('ready_to_play');
          }, 1100);
        }
      } else {
        // Rule 9: "If all four players choose PASS and nobody increases their bid, end the bidding/game according to the existing game rules."
        setWinningBid(10);
        setWinningBidderSeatIndex(null);
        setAuctionComplete(true);
        setAwaitingTrumpSelection(false);
        // Default trump on all pass is Spades
        setTrumpSuit('Spades');
        setTrumpSelectedBy('default_all_passed');
        setStage('ready_to_play');
      }

      return currentBids;
    });
  };

  // Human flexible increase handler
  const handleHumanFlexibleIncrease = () => {
    if (flexibleTurnIndex !== 0) return;
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setPlayerBids((prevBids) => {
      const nextBids = [...prevBids];
      nextBids[0] = humanFlexibleAmount;
      return nextBids;
    });
    setFlexibleIncreasesCount((c) => c + 1);
    setFlexibleResponses((prev) => {
      const next = [...prev];
      next[0] = { action: 'increase', amount: humanFlexibleAmount };
      return next;
    });
    setBidHistory((prev) => [
      ...prev,
      {
        stage: 'flexible_bid_increase',
        seatIndex: 0,
        playerName: humanCharacter.name,
        action: 'increase',
        amount: humanFlexibleAmount,
      },
    ]);
    advanceFlexibleStep();
  };

  // Human flexible pass handler
  const handleHumanFlexiblePass = () => {
    if (flexibleTurnIndex !== 0) return;
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setPlayerBids((prevBids) => {
      const nextBids = [...prevBids];
      nextBids[0] = 10;
      return nextBids;
    });
    setFlexibleResponses((prev) => {
      const next = [...prev];
      next[0] = { action: 'pass', amount: 10 };
      return next;
    });
    setBidHistory((prev) => [
      ...prev,
      {
        stage: 'flexible_bid_increase',
        seatIndex: 0,
        playerName: humanCharacter.name,
        action: 'pass',
        amount: 10,
      },
    ]);
    advanceFlexibleStep();
  };

  // Advance to Next Progressive Deal & Bidding
  const handleProceedNextStage = () => {
    if (!batches) return;
    playDeal();

    if (stage === 'first_bidding') {
      // Stage 2: Deal 4 additional cards -> 9 cards each
      setStage('second_deal');
      const hands9 = batches.batch1.map((b1, s) =>
        sortHand([...b1, ...batches.batch2[s]])
      );
      setPlayerHands(hands9);

      setTimeout(() => {
        startBiddingStage('second_bidding');
      }, 1000);
    } else if (stage === 'second_bidding') {
      // Stage 3: Deal final 4 cards -> 13 cards each
      setStage('final_deal');
      const hands13 = batches.batch1.map((b1, s) =>
        sortHand([...b1, ...batches.batch2[s], ...batches.batch3[s]])
      );
      setPlayerHands(hands13);

      setTimeout(() => {
        startBiddingStage('final_bidding');
      }, 1000);
    }
  };

  // Human Bid Submission
  const handleHumanBid = () => {
    if (currentBidderIndex !== 0) return;
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    recordBid(0, customBidAmount, humanCharacter.name);
  };

  // Human Pass Submission
  const handleHumanPass = () => {
    if (currentBidderIndex !== 0) return;
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    recordPass(0, humanCharacter.name);
  };

  // 10-Second Countdown Timer for Human Bidding Turn
  const isBiddingStage =
    stage === 'first_bidding' ||
    stage === 'second_bidding' ||
    stage === 'final_bidding';

  const isHumanBiddingTurn =
    (!auctionComplete && !stageComplete && (
      (isBiddingStage && currentBidderIndex === 0) ||
      (isFlexibleIncreasePhase && flexibleTurnIndex === 0)
    ));

  useEffect(() => {
    if (!isHumanBiddingTurn) {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }

    setBiddingCountdown(10);
    setTimeUpPassed(false);

    countdownTimerRef.current = setInterval(() => {
      setBiddingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          setTimeUpPassed(true);
          playNotification();

          // Immediately execute auto-pass
          setTimeout(() => {
            if (isFlexibleIncreasePhase) {
              handleHumanFlexiblePass();
            } else {
              handleHumanPass();
            }
          }, 350);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [isHumanBiddingTurn, currentBidderIndex, flexibleTurnIndex, isFlexibleIncreasePhase, stage]);

  // Human Trump (Pradhan) Selection
  const handleHumanTrumpSelect = (suit) => {
    const chosenSuit = suit || selectedPradhanSuit || 'Hearts';
    const suitMeta = getPradhanSuitConfig(chosenSuit);
    playTrump();
    setTrumpSuit(suitMeta.suit);
    setTrumpSelectedBy(0);
    setAwaitingTrumpSelection(false);
    setOfflinePradhanAnnouncement({
      selectorName: humanCharacter.name,
      suit: suitMeta.suit,
      suitLabel: suitMeta.label,
      suitSymbol: suitMeta.symbol,
      timestamp: Date.now(),
    });
    setStage('ready_to_play');
  };

  // Stage 8 Trick-Taking Setup
  useEffect(() => {
    if (stage === 'ready_to_play' && trickTurnIndex === null) {
      setTrickTurnIndex(winningBidderSeatIndex ?? 0);
    }
  }, [stage, trickTurnIndex, winningBidderSeatIndex]);

  // Bot Turn in Stage 8
  useEffect(() => {
    if (stage !== 'ready_to_play' || trickTurnIndex === null || trickTurnIndex === 0) return;

    const botChar = allSeats[trickTurnIndex]?.character;
    const botHand = playerHands[trickTurnIndex] || [];
    if (botHand.length === 0) return;

    timerRef.current = setTimeout(() => {
      const cardToPlay = botHand[0];
      const nextHand = botHand.slice(1);
      playCardPlay();

      setPlayerHands((prev) => {
        const next = [...prev];
        next[trickTurnIndex] = nextHand;
        return next;
      });

      setTrickCards((prev) => {
        const next = [...prev];
        next[trickTurnIndex] = { ...cardToPlay, seatIndex: trickTurnIndex };

        const filled = next.filter(Boolean).length;
        if (filled === 4) {
          evaluateOfflineTrick(next);
        } else {
          setTrickTurnIndex((trickTurnIndex + 1) % 4);
        }
        return next;
      });
    }, 900);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stage, trickTurnIndex, playerHands]);

  const handleHumanPlayCard = (card, idx) => {
    if (stage !== 'ready_to_play' || trickTurnIndex !== 0 || !card) return;
    playCardPlay();

    setPlayerHands((prev) => {
      const next = [...prev];
      next[0] = next[0].filter((_, i) => i !== idx);
      return next;
    });
    setSelectedCardIdx(null);

    setTrickCards((prev) => {
      const next = [...prev];
      next[0] = { ...card, seatIndex: 0 };
      const filled = next.filter(Boolean).length;
      if (filled === 4) {
        evaluateOfflineTrick(next);
      } else {
        setTrickTurnIndex(1);
      }
      return next;
    });
  };

  const evaluateOfflineTrick = (cards) => {
    let winningSeat = 0;
    let highestVal = -1;
    let hasTrump = false;

    cards.forEach((c, seatIdx) => {
      if (!c) return;
      const isTrump = trumpSuit && c.suit.toLowerCase() === trumpSuit.toLowerCase();
      if (isTrump && !hasTrump) {
        hasTrump = true;
        winningSeat = seatIdx;
        highestVal = c.value || 0;
      } else if (isTrump && hasTrump) {
        if ((c.value || 0) > highestVal) {
          winningSeat = seatIdx;
          highestVal = c.value || 0;
        }
      } else if (!hasTrump) {
        if ((c.value || 0) > highestVal) {
          winningSeat = seatIdx;
          highestVal = c.value || 0;
        }
      }
    });

    const winCard = cards[winningSeat];
    const winChar = allSeats[winningSeat]?.character;
    playTrickWin();

    const completedTrick = {
      winnerSeatIndex: winningSeat,
      winnerName: winChar?.name || 'Winner',
      winningCard: winCard,
      cards: [...cards],
      leadSuit: cards[0]?.suit,
      trumpSuit,
      completedAt: Date.now(),
    };
    setTrickHistory((prev) => [...prev, completedTrick]);

    setLastTrickResult({
      winnerSeatIndex: winningSeat,
      winnerName: winChar?.name || 'Winner',
      winningCard: winCard,
    });

    setTricksWon((prev) => {
      const next = [...prev];
      next[winningSeat] = (next[winningSeat] || 0) + 1;
      const totalTricks = next.reduce((a, b) => a + b, 0);
      if (totalTricks === 13) {
        evaluateOfflineRound(next);
      }
      return next;
    });

    setTimeout(() => {
      setTrickCards([null, null, null, null]);
      setLastTrickResult(null);
      setTrickTurnIndex(winningSeat);
    }, 2800);
  };

  const evaluateOfflineRound = (tricksCount) => {
    const scoreDeltas = [0, 0, 0, 0];
    const winningBidder = winningBidderSeatIndex;

    for (let s = 0; s < 4; s++) {
      const tricks = tricksCount[s] || 0;
      if (winningBidder !== null && winningBidder !== undefined && s === winningBidder) {
        if (tricks >= winningBid) {
          scoreDeltas[s] = tricks;
        } else {
          scoreDeltas[s] = -winningBid; // MINUS rule
        }
      } else {
        scoreDeltas[s] = tricks;
      }
    }

    setScores((prevScores) => {
      const nextScores = prevScores.map((sc, i) => sc + scoreDeltas[i]);

      const roundRecord = {
        roundNumber: currentRound,
        trumpSuit,
        trumpSelectedBy,
        winningBid,
        winningBidderSeatIndex,
        playerBids: [...playerBids],
        tricksWon: [...tricksCount],
        scoreDeltas,
        accumulatedScores: nextScores,
        completedAt: Date.now(),
      };
      setRoundHistory((prevHistory) => [...prevHistory, roundRecord]);

      if (nextScores.some((sc) => sc >= gameTarget)) {
        setMatchOver(true);
        const maxScore = Math.max(...nextScores);
        const championSeat = nextScores.indexOf(maxScore);
        setMatchWinnerSeatIndex(championSeat);
        if (championSeat === 0) {
          playVictory();
        } else {
          playDefeat();
        }
        setTimeout(() => {
          setShowWinnerModal(true);
        }, 1500);
      }

      return nextScores;
    });
  };

  // Helper for seat labels
  const getSeatCardCount = () => {
    if (stage === 'first_deal' || stage === 'first_bidding') return 5;
    if (stage === 'second_deal' || stage === 'second_bidding') return 9;
    return 13;
  };

  const humanHand = playerHands[0] || [];
  const expectedCount = getSeatCardCount();

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 sm:p-4 lg:p-6 w-full max-w-7xl mx-auto relative select-none">
      {/* Simultaneous Pradhan Announcement Overlay */}
      <PradhanAnnouncementOverlay
        announcement={offlinePradhanAnnouncement}
        onDismiss={() => setOfflinePradhanAnnouncement(null)}
      />

      {/* Top Header Bar: PRO CARD Offline Arena Branding & Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-2xl px-4 py-2.5 shadow-2xl mb-2 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Match</span>
          </button>

          {/* PRO CARD Branding Emblem */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-amber-500/40 text-amber-300 text-xs font-serif font-black shadow-inner">
            <span className="text-amber-400 font-sans tracking-widest text-[11px] font-bold uppercase">
              PRO CARD
            </span>
            <span className="text-slate-600 font-normal">•</span>
            <span className="text-[10px] text-slate-400 font-mono font-medium">Offline Arena</span>
          </div>

          {/* Target Score Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Target {gameTarget}</span>
          </div>

          {/* Dealer Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <span className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-slate-950 font-serif font-black text-[10px] flex items-center justify-center">
              D
            </span>
            <span>Dealer: {allSeats[dealerSeatIndex]?.character.name}</span>
          </div>
        </div>

        {/* Permanent Pinned PRADHAN Indicator */}
        {trumpSuit && (
          <PradhanPinnedIndicator
            trumpSuit={trumpSuit}
            trumpSelectedBy={trumpSelectedBy}
            selectorName={allSeats[trumpSelectedBy]?.character?.name}
          />
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Direct Quick Mute/Unmute Button */}
          <button
            onClick={toggleMute}
            title={settings.isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold font-mono transition-all shadow-sm active:scale-95 cursor-pointer ${
              settings.isMuted
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/60'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
            }`}
          >
            {settings.isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sound</span>
              </>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={openSettings}
            title="Open Sound & Game Settings"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* Scoreboard Button */}
          <button
            onClick={() => setShowScoreboardModal(true)}
            title="View Scoreboard & Match History"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Scoreboard</span>
          </button>

          <button
            onClick={() => initNewGame(true)}
            title="Restart Match with new deck"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restart</span>
          </button>
        </div>
      </div>

      {/* PRO CARD Scoreboard */}
      <div className="w-full max-w-5xl bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 sm:p-4 my-1.5 shadow-2xl relative z-20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Target Score */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-400/40 text-xs font-mono">
              <span className="text-[10px] text-amber-400 uppercase font-bold">Target:</span>
              <strong className="text-amber-300 font-bold">{gameTarget} Pts</strong>
            </div>

            {/* Pradhan (Trump) Display */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Pradhan:</span>
              {trumpSuit ? (
                <span className="flex items-center gap-1 font-bold text-amber-300">
                  <span className={`text-base font-serif font-black ${trumpSuit === 'Hearts' || trumpSuit === 'Diamonds' ? 'text-rose-500' : 'text-amber-400'}`}>
                    {trumpSuit === 'Hearts' ? '♥' : trumpSuit === 'Diamonds' ? '♦' : trumpSuit === 'Clubs' ? '♣' : '♠'}
                  </span>
                  <span>{trumpSuit}</span>
                  {trumpSelectedBy === 'default_all_passed' && (
                    <span className="text-[9px] text-slate-500 font-normal">(Default)</span>
                  )}
                </span>
              ) : (
                <span className="text-slate-500 italic">Pending Auction</span>
              )}
            </div>

            {/* Auction Status */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Leader:</span>
              {highestBid !== null ? (
                <strong className="text-white font-bold">
                  {highestBid} ({allSeats[highestBidderSeatIndex]?.character.name})
                </strong>
              ) : (
                <span className="text-slate-500">None</span>
              )}
            </div>

            {/* Scores summary */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono">
              <span className="text-[10px] text-amber-400 uppercase font-bold">Scores:</span>
              <span className="text-slate-300">
                You: <strong className="text-amber-300">{scores[0]}</strong> |{' '}
                {allSeats[1]?.character.initials}: {scores[1]} |{' '}
                {allSeats[2]?.character.initials}: {scores[2]} |{' '}
                {allSeats[3]?.character.initials}: {scores[3]}
              </span>
            </div>

            {/* Independent Player Bids Display */}
            {playerBids.some((b) => b !== null) && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono">
                <span className="text-[10px] text-amber-400 uppercase font-bold">Bids:</span>
                <span className="text-slate-300">
                  <span className="text-amber-300 font-bold">You:{playerBids[0] ?? '-'}</span>{' '}
                  <span className="text-slate-600">|</span> W:{playerBids[1] ?? '-'}{' '}
                  <span className="text-slate-600">|</span> N:{playerBids[2] ?? '-'}{' '}
                  <span className="text-slate-600">|</span> E:{playerBids[3] ?? '-'}
                </span>
              </div>
            )}

            {/* Special Rule Banner when Active */}
            {isFlexibleIncreasePhase && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-mono font-bold animate-pulse">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>All 4 Bid 10: Asking {allSeats[flexibleTurnIndex]?.character.name}...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Bot Thinking Status Alert */}
            {thinkingBotName && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-sky-950/50 border border-sky-600/40 text-sky-300 text-xs font-mono animate-pulse">
                <Bot className="w-3.5 h-3.5 text-sky-400" />
                <span>{thinkingBotName} is calculating bid...</span>
              </div>
            )}

            {/* Full Scoreboard Button */}
            <button
              onClick={() => setShowScoreboardModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/50 hover:border-amber-400 text-amber-300 text-xs font-bold font-mono transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Scoreboard & History</span>
              {roundHistory.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  R{currentRound}
                </span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-amber-400/80" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chess-Inspired PRO CARD Table */}
      <div className="relative w-full max-w-5xl flex-1 flex flex-col items-center justify-center min-h-[460px] sm:min-h-[520px] lg:min-h-[560px] my-2">
        {/* Padded Leather Rail - Sleek Dark Charcoal */}
        <div className="w-full h-full absolute inset-0 rounded-[45px] sm:rounded-[70px] bg-gradient-to-b from-[#18181b] via-[#09090b] to-[#18181b] p-3.5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95)] border border-slate-800">
          {/* Ornate Steel & Brass Trim */}
          <div className="w-full h-full rounded-[35px] sm:rounded-[55px] bg-gradient-to-tr from-slate-700 via-amber-600/30 to-slate-800 p-1">
            {/* Charcoal / Slate Chess-Inspired Felt Table Surface */}
            <div className="w-full h-full rounded-[30px] sm:rounded-[50px] bg-radial from-[#1e293b] via-[#0f172a] to-[#020617] relative overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] flex items-center justify-center border border-slate-800">
              {/* Subtle Chess Board Grid & Oval Accent Watermark */}
              <div className="absolute inset-5 sm:inset-10 rounded-[25px] sm:rounded-[42px] border border-slate-700/30 pointer-events-none" />

              {/* Central Table Centerpiece: PRO CARD Emblem */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                {/* Chess Inspired Emblem & PRO CARD Watermark */}
                <div className="opacity-15 flex flex-col items-center pointer-events-none select-none mb-2">
                  <div className="flex items-center gap-2 text-2xl sm:text-3xl font-serif text-slate-300">
                    <span>♚</span>
                    <span className="font-sans font-black tracking-widest">PRO CARD</span>
                    <span>♛</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 tracking-[0.4em] font-mono">
                    <span>♠</span>
                    <span>♥</span>
                    <span>♦</span>
                    <span>♣</span>
                  </div>
                </div>

                {/* Central Arena Hub */}
                <div className="relative w-56 h-56 sm:w-68 sm:h-68 rounded-full border border-slate-700/50 bg-slate-950/60 backdrop-blur-[6px] flex flex-col items-center justify-center shadow-[inset_0_0_35px_rgba(0,0,0,0.8)] p-4">
                  {/* Current Stage Indicator */}
                  <div className="px-3 py-1 rounded-full bg-slate-900 border border-amber-500/40 text-[10px] font-mono text-amber-300 font-extrabold uppercase tracking-widest shadow-md mb-2">
                    {stage.replace('_', ' ')}
                  </div>

                  {/* Stage Details */}
                  {stage === 'first_deal' && (
                    <div className="flex flex-col items-center animate-fade-in">
                      <div className="w-12 h-16 rounded-xl card-back-ornate shadow-2xl border-2 border-amber-400 mb-2 transform -rotate-3" />
                      <span className="text-xs font-mono font-bold text-slate-200">
                        Dealing 5 Cards
                      </span>
                    </div>
                  )}

                  {(stage === 'first_bidding' || stage === 'second_bidding' || stage === 'final_bidding') && (
                    <div className="flex flex-col items-center w-full max-w-[220px]">
                      <div className="text-xs font-black font-mono text-amber-300 uppercase tracking-wider mb-1">
                        Auction in Progress
                      </div>

                      <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2 my-1 shadow-inner text-left text-[10px] font-mono">
                        <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-1 mb-1">
                          <span>Highest:</span>
                          <strong className="text-amber-300 font-bold">
                            {highestBid !== null ? `${highestBid} (${allSeats[highestBidderSeatIndex]?.character.name})` : 'None'}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Min Next:</span>
                          <strong className="text-amber-400 font-bold">{getMinNextBid()}</strong>
                        </div>
                      </div>

                      {stageComplete && !auctionComplete && (
                        <button
                          onClick={handleProceedNextStage}
                          className="mt-2 flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer"
                        >
                          <span>Next Deal</span>
                          <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      )}

                      {/* Trigger button during final_bidding for All 4 Players Bid 10 */}
                      {stage === 'final_bidding' && !isFlexibleIncreasePhase && (
                        <button
                          onClick={triggerAllPlayersBid10}
                          title="Trigger the special rule: when all 4 players have bid 10"
                          className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-300 text-[9px] font-mono font-black uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>All 4 Bid 10 (Rule)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Flexible Bid Increase Phase in Center Hub */}
                  {isFlexibleIncreasePhase && (
                    <div className="flex flex-col items-center w-full max-w-[220px] animate-fade-in">
                      <div className="text-[11px] font-black font-mono text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>All 4 Bid 10 Phase</span>
                      </div>

                      <div className="w-full bg-slate-950/90 border border-amber-400/50 rounded-xl p-2 my-1 shadow-inner text-left text-[10px] font-mono">
                        <div className="text-slate-300 border-b border-slate-800 pb-1 mb-1">
                          Rule: <strong className="text-amber-300 font-bold">Independent Bids</strong>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Answering:</span>
                          <strong className="text-amber-300 font-bold">
                            {allSeats[flexibleTurnIndex]?.character.name || 'Complete'}
                          </strong>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 mt-1">
                        Increase by ANY amount or Pass
                      </span>
                    </div>
                  )}

                  {stage === 'second_deal' && (
                    <div className="flex flex-col items-center animate-fade-in">
                      <div className="text-xl font-mono font-black text-amber-300">9 Cards Dealt</div>
                      <span className="text-[10px] font-mono text-slate-400 mt-1">Starting Stage 2 Bidding...</span>
                    </div>
                  )}

                  {stage === 'final_deal' && (
                    <div className="flex flex-col items-center animate-fade-in">
                      <div className="text-xl font-mono font-black text-amber-300">13 Cards Dealt</div>
                      <span className="text-[10px] font-mono text-slate-400 mt-1">Starting Final Bidding...</span>
                    </div>
                  )}

                  {/* Prominent Pradhan / Trump Suit Emblem */}
                  {trumpSuit && (
                    <div className="mt-2 flex flex-col items-center animate-fade-in">
                      <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950 border border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                        <span className={`text-2xl font-serif font-black ${trumpSuit === 'Hearts' || trumpSuit === 'Diamonds' ? 'text-rose-500' : 'text-amber-400'}`}>
                          {trumpSuit === 'Hearts' ? '♥' : trumpSuit === 'Diamonds' ? '♦' : trumpSuit === 'Clubs' ? '♣' : '♠'}
                        </span>
                        <span className="text-xs font-mono font-black text-amber-300 uppercase tracking-widest">
                          Trump: {trumpSuit}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                        Selected by {allSeats[trumpSelectedBy]?.character.name || 'Default Protocol'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Four Player Positions Around Table --- */}

        {/* 1. TOP (North): Bot 2 */}
        <div className="absolute top-3 sm:top-6 z-20 flex flex-col items-center gap-1">
          {botDialogues[2] && (
            <div className="px-3 py-1 rounded-xl bg-slate-950/90 border border-amber-400/60 text-amber-200 text-xs italic font-serif shadow-lg animate-bounce max-w-[220px] text-center">
              "{botDialogues[2]}"
            </div>
          )}
          <div className="flex items-center gap-2">
            <OfflineSeatCard
              seat={allSeats[2]}
              isCurrentTurn={stage === 'ready_to_play' ? trickTurnIndex === 2 : isFlexibleIncreasePhase ? flexibleTurnIndex === 2 : currentBidderIndex === 2}
              isDealer={dealerSeatIndex === 2}
              cardCount={expectedCount}
              independentBid={playerBids[2]}
              flexibleResponse={flexibleResponses[2]}
              tricksWon={tricksWon[2]}
              isThinking={thinkingBotName && thinkingBotName.includes(allSeats[2]?.character?.name)}
              isSpeakingQuip={!!botDialogues[2]}
              isTrickWinner={lastTrickResult?.winnerSeatIndex === 2}
              isTrickLoser={lastTrickResult && lastTrickResult.winnerSeatIndex !== 2}
            />
          </div>
        </div>

        {/* 2. LEFT (West): Bot 1 */}
        <div className="absolute left-2 sm:left-6 z-20 flex flex-col items-center gap-1">
          {botDialogues[1] && (
            <div className="px-3 py-1 rounded-xl bg-slate-950/90 border border-amber-400/60 text-amber-200 text-xs italic font-serif shadow-lg animate-bounce max-w-[180px] text-center">
              "{botDialogues[1]}"
            </div>
          )}
          <div className="flex items-center gap-2">
            <OfflineSeatCard
              seat={allSeats[1]}
              isCurrentTurn={stage === 'ready_to_play' ? trickTurnIndex === 1 : isFlexibleIncreasePhase ? flexibleTurnIndex === 1 : currentBidderIndex === 1}
              isDealer={dealerSeatIndex === 1}
              cardCount={expectedCount}
              independentBid={playerBids[1]}
              flexibleResponse={flexibleResponses[1]}
              tricksWon={tricksWon[1]}
              isThinking={thinkingBotName && thinkingBotName.includes(allSeats[1]?.character?.name)}
              isSpeakingQuip={!!botDialogues[1]}
              isTrickWinner={lastTrickResult?.winnerSeatIndex === 1}
              isTrickLoser={lastTrickResult && lastTrickResult.winnerSeatIndex !== 1}
            />
          </div>
        </div>

        {/* 3. RIGHT (East): Bot 3 */}
        <div className="absolute right-2 sm:right-6 z-20 flex flex-col items-center gap-1">
          {botDialogues[3] && (
            <div className="px-3 py-1 rounded-xl bg-slate-950/90 border border-amber-400/60 text-amber-200 text-xs italic font-serif shadow-lg animate-bounce max-w-[180px] text-center">
              "{botDialogues[3]}"
            </div>
          )}
          <div className="flex items-center gap-2">
            <OfflineSeatCard
              seat={allSeats[3]}
              isCurrentTurn={stage === 'ready_to_play' ? trickTurnIndex === 3 : isFlexibleIncreasePhase ? flexibleTurnIndex === 3 : currentBidderIndex === 3}
              isDealer={dealerSeatIndex === 3}
              cardCount={expectedCount}
              independentBid={playerBids[3]}
              flexibleResponse={flexibleResponses[3]}
              tricksWon={tricksWon[3]}
              isThinking={thinkingBotName && thinkingBotName.includes(allSeats[3]?.character?.name)}
              isSpeakingQuip={!!botDialogues[3]}
              isTrickWinner={lastTrickResult?.winnerSeatIndex === 3}
              isTrickLoser={lastTrickResult && lastTrickResult.winnerSeatIndex !== 3}
            />
          </div>
        </div>

        {/* 4. BOTTOM (South): YOU (Human Player) */}
        <div className="absolute bottom-3 sm:bottom-6 z-20 flex items-center gap-2">
          <OfflineSeatCard
            seat={allSeats[0]}
            isCurrentTurn={stage === 'ready_to_play' ? trickTurnIndex === 0 : isFlexibleIncreasePhase ? flexibleTurnIndex === 0 : currentBidderIndex === 0}
            isDealer={dealerSeatIndex === 0}
            cardCount={humanHand.length}
            isYou={true}
            independentBid={playerBids[0]}
            flexibleResponse={flexibleResponses[0]}
            tricksWon={tricksWon[0]}
            isThinking={stage === 'ready_to_play' ? trickTurnIndex === 0 : isFlexibleIncreasePhase ? flexibleTurnIndex === 0 : currentBidderIndex === 0}
            isSpeakingQuip={false}
            isTrickWinner={lastTrickResult?.winnerSeatIndex === 0}
            isTrickLoser={lastTrickResult && lastTrickResult.winnerSeatIndex !== 0}
          />
        </div>
      </div>

      {/* 10-Second Bidding Countdown Widget (Offline VS Bots) */}
      {(isBiddingStage || isFlexibleIncreasePhase) && (
        <BiddingCountdownWidget
          secondsRemaining={isHumanBiddingTurn ? biddingCountdown : (thinkingBotName ? 8 : 10)}
          maxSeconds={10}
          characterId={
            isFlexibleIncreasePhase
              ? allSeats[flexibleTurnIndex ?? 0]?.character?.id || 'odi'
              : allSeats[currentBidderIndex ?? 0]?.character?.id || 'odi'
          }
          characterName={
            isFlexibleIncreasePhase
              ? allSeats[flexibleTurnIndex ?? 0]?.character?.name || 'Player'
              : allSeats[currentBidderIndex ?? 0]?.character?.name || 'Player'
          }
          isMyTurn={isHumanBiddingTurn}
          stageLabel={
            isFlexibleIncreasePhase
              ? 'SPECIAL RULE: All 4 Players Bid 10'
              : STAGES.find((s) => s.id === stage)?.label || 'Bidding Stage'
          }
          minOpening={
            stage === 'first_bidding' ? 5 : stage === 'second_bidding' ? 8 : 10
          }
          minNextBid={isFlexibleIncreasePhase ? 11 : getMinNextBid()}
          maxBid={isFlexibleIncreasePhase ? 25 : 13}
          highestBid={highestBid}
          highestBidderName={
            highestBidderSeatIndex !== null
              ? allSeats[highestBidderSeatIndex]?.character?.name
              : null
          }
          selectedAmount={
            isFlexibleIncreasePhase ? humanFlexibleAmount : customBidAmount
          }
          onAmountChange={
            isFlexibleIncreasePhase ? setHumanFlexibleAmount : setCustomBidAmount
          }
          onConfirmBid={
            isFlexibleIncreasePhase ? handleHumanFlexibleIncrease : handleHumanBid
          }
          onPass={
            isFlexibleIncreasePhase ? handleHumanFlexiblePass : handleHumanPass
          }
          isFlexibleIncrease={isFlexibleIncreasePhase}
          submitting={false}
          isComplete={stageComplete && !auctionComplete}
          onAdvance={handleProceedNextStage}
          isHost={true}
          timeUpPassed={timeUpPassed}
        />
      )}

      {/* Human Trump Selection Modal (Active if human wins auction) */}
      {awaitingTrumpSelection && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in select-none">
          <div className="w-full max-w-2xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 border-2 border-amber-500/80 rounded-3xl p-5 sm:p-8 text-center shadow-[0_25px_80px_rgba(245,158,11,0.35)] relative overflow-hidden">
            <div className="flex flex-col items-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-lg border border-amber-200 mb-2.5">
                <Crown className="w-8 h-8 text-zinc-950 stroke-[2.5]" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-[10px] sm:text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>You Won the Auction (Bid: {winningBid})</span>
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-serif tracking-wider text-slate-100 mt-2 uppercase">
                CHOOSE YOUR PRADHAN
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 max-w-md">
                Select your official <strong className="text-amber-400">PRADHAN</strong> suit. All 13 cards of this suit will dominate trick play!
              </p>
            </div>

            {/* 4 Large Selectable Suit Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {PRADHAN_SUITS.map((item, index) => {
                const isSelected = selectedPradhanSuit === item.suit;
                return (
                  <button
                    key={item.suit}
                    type="button"
                    onClick={() => setSelectedPradhanSuit(item.suit)}
                    className={`group relative flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? `${item.selectedBorder} scale-105 shadow-2xl bg-gradient-to-b ${item.bgGradient}`
                        : `border-zinc-800 hover:border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800/80 opacity-80 hover:opacity-100 hover:scale-[1.02]`
                    } active:scale-95 text-left`}
                    style={isSelected ? { boxShadow: item.glowBoxShadow } : {}}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">#{index + 1}</span>
                      <span className="text-[9px] font-mono text-slate-400">13 Cards</span>
                    </div>
                    <div className="my-1 text-center w-full">
                      <div className="text-xs sm:text-sm font-black font-serif text-slate-100">
                        {item.hindiName}
                      </div>
                      <div className="text-[10px] font-mono font-bold tracking-wider text-amber-400 uppercase">
                        {item.latinName}
                      </div>
                    </div>
                    <div className="my-2 flex items-center justify-center">
                      <span
                        className={`text-5xl sm:text-6xl font-serif font-black ${item.colorClass} group-hover:scale-110 transition-transform`}
                        style={isSelected ? { textShadow: `0 0 15px ${item.glowColor}` } : {}}
                      >
                        {item.symbol}
                      </span>
                    </div>
                    <div
                      className={`w-full text-center py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
                        isSelected
                          ? 'bg-amber-400 text-zinc-950 font-black'
                          : 'bg-zinc-800/80 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {isSelected ? 'SELECTED' : 'SELECT'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confirm Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div className="flex items-center gap-2 text-left">
                <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400 font-mono">Selected Pradhan:</div>
                  <div className="text-sm font-black font-serif text-amber-400">
                    {PRADHAN_SUITS.find((s) => s.suit === selectedPradhanSuit)?.label || selectedPradhanSuit}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleHumanTrumpSelect(selectedPradhanSuit)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 active:scale-95 text-zinc-950 font-black font-mono uppercase tracking-wider text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                <span>CONFIRM PRADHAN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "My Hand" Display Area at the Bottom */}
      <div className="w-full max-w-4xl bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 sm:p-4 mt-2 shadow-2xl relative z-20">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {humanCharacter.name}'s Hand:
            </span>
            <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300">
              {humanHand.length} Cards
            </span>
          </div>

          {selectedCardIdx !== null && humanHand[selectedCardIdx] && (
            <div className="flex items-center gap-2 bg-slate-900 border border-amber-400/60 rounded-xl px-3 py-1 shadow-lg animate-fade-in">
              <span className="text-xs font-mono text-slate-300">
                Selected: <strong className="text-amber-300">{humanHand[selectedCardIdx].rank}</strong> {humanHand[selectedCardIdx].suit}
              </span>
              {stage === 'ready_to_play' && trickTurnIndex === 0 && (
                <button
                  onClick={() => handleHumanPlayCard(humanHand[selectedCardIdx], selectedCardIdx)}
                  className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-slate-950" />
                  <span>Play Card</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-slate-300 font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>Cards Private to You</span>
            </span>
          </div>
        </div>

        {/* Fanned Cards */}
        <div className="flex items-end justify-center -space-x-4 sm:-space-x-6 md:-space-x-8 overflow-x-auto pt-5 pb-2 px-3 no-scrollbar min-h-[135px] sm:min-h-[160px]">
          {humanHand.map((card, idx) => {
            const total = humanHand.length;
            const mid = (total - 1) / 2;
            const rotation = (idx - mid) * (total > 9 ? 2.1 : 3.0);
            const translateY = Math.abs(idx - mid) * (total > 9 ? 1.6 : 2.2);
            const isSelected = selectedCardIdx === idx;

            return (
              <div
                key={card.id || idx}
                className="animate-deal-card shrink-0 transition-transform duration-200"
                style={{ animationDelay: `${idx * 35}ms` }}
              >
                <PlayingCard
                  rank={card.rank}
                  suit={card.suit}
                  isFaceUp={true}
                  isInteractive={true}
                  isSelected={isSelected}
                  isPradhan={Boolean(trumpSuit && String(card.suit || '').toUpperCase() === String(trumpSuit || '').toUpperCase())}
                  rotation={isSelected ? 0 : rotation}
                  translateY={translateY}
                  onClick={() => {
                    if (isSelected && stage === 'ready_to_play' && trickTurnIndex === 0) {
                      handleHumanPlayCard(card, idx);
                    } else {
                      setSelectedCardIdx(isSelected ? null : idx);
                    }
                  }}
                  size="md"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Scoreboard & Match History Modal */}
      <ScoreboardModal
        isOpen={showScoreboardModal}
        onClose={() => setShowScoreboardModal(false)}
        gameState={{
          scores,
          tricksWon,
          roundHistory,
          trickHistory,
          currentRoundNumber: currentRound,
          matchOver,
          matchWinnerSeatIndex,
          trumpSuit,
          bidding: {
            winningBid,
            winningBidderSeatIndex,
            highestBid,
            highestBidderSeatIndex,
            playerBids,
          },
        }}
        seats={allSeats}
        gameTarget={gameTarget}
        onPlayAgain={() => initNewGame(true)}
        isHost={true}
        isOffline={true}
      />

      {/* Match Champion & Rankings Winner Modal */}
      <MatchWinnerModal
        isOpen={showWinnerModal || matchOver}
        onClose={() => setShowWinnerModal(false)}
        gameState={{
          scores,
          tricksWon,
          roundHistory,
          trickHistory,
          currentRoundNumber: currentRound,
          matchOver,
          matchWinnerSeatIndex,
          trumpSuit,
          bidding: {
            winningBid,
            winningBidderSeatIndex,
            highestBid,
            highestBidderSeatIndex,
            playerBids,
          },
        }}
        seats={allSeats}
        gameTarget={gameTarget}
        onPlayAgain={() => initNewGame(true)}
        onOpenScoreboard={() => setShowScoreboardModal(true)}
        isHost={true}
        isOffline={true}
      />

      {/* Complete Audio & Game Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={closeSettings}
      />
    </div>
  );
};

// Sub-component: Player / Bot Seat Card
function OfflineSeatCard({
  seat,
  isCurrentTurn,
  isDealer,
  cardCount,
  isYou = false,
  independentBid = null,
  flexibleResponse = null,
  tricksWon = 0,
  isThinking = false,
  isSpeakingQuip = false,
  isTrickWinner = false,
  isTrickLoser = false,
}) {
  if (!seat) return null;
  const { character, isHuman, seatName } = seat;

  // Resolve dynamic avatar animation state
  let avatarState = 'idle';
  if (isTrickWinner) {
    avatarState = 'celebrating';
  } else if (isTrickLoser) {
    avatarState = 'disappointed';
  } else if (isSpeakingQuip) {
    avatarState = 'speaking';
  } else if (isCurrentTurn || isThinking) {
    avatarState = 'thinking';
  }

  return (
    <div
      className={`relative flex items-center gap-2.5 sm:gap-3 p-2 sm:px-3.5 sm:py-2.5 rounded-2xl border backdrop-blur-xl transition-all duration-300 shadow-2xl select-none ${
        isTrickWinner
          ? 'ring-4 ring-amber-400 bg-slate-950/95 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.8)]'
          : isCurrentTurn
          ? 'ring-4 ring-amber-400 bg-slate-950/95 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.7)] animate-pulse'
          : isYou
          ? 'bg-gradient-to-r from-slate-950/95 via-slate-900 to-slate-950/95 border-amber-500/80 shadow-[0_8px_25px_rgba(245,158,11,0.2)]'
          : 'bg-slate-950/85 border-slate-800 shadow-black/80'
      }`}
    >
      {/* Active Turn Glowing Pill */}
      {isCurrentTurn && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg z-30 animate-bounce">
          <Zap className="w-2.5 h-2.5 fill-slate-950" />
          <span>{isYou ? 'YOUR TURN' : 'ACTIVE TURN'}</span>
        </div>
      )}

      {/* 3D Animated Character Avatar */}
      <AnimatedCharacterAvatar
        characterId={character.id}
        state={avatarState}
        size="sm"
        isHuman={isHuman}
        isBot={!isHuman}
        showGlow={isCurrentTurn || isTrickWinner}
        badge={
          isDealer ? (
            <div
              title="Dealer"
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-600 border border-white/90 flex items-center justify-center shadow-lg font-serif font-black text-[9px] sm:text-[10px] text-slate-950"
            >
              D
            </div>
          ) : null
        }
      />

      {/* Information */}
      <div className="min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[90px] sm:max-w-[130px] tracking-wide">
            {character.name}
          </span>

          {isYou ? (
            <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 rounded-md bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 uppercase tracking-widest shadow-sm">
              YOU
            </span>
          ) : (
            <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-sky-950/80 border border-sky-600/40 text-sky-300 uppercase tracking-wider flex items-center gap-1">
              <Bot className="w-2.5 h-2.5 text-sky-400" />
              <span>BOT</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
          <span className="text-amber-400/90 font-medium">{seatName}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">{cardCount}c</span>

          {tricksWon > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-amber-300 font-bold flex items-center gap-0.5">
                <Trophy className="w-2.5 h-2.5 text-amber-400 inline" />
                <span>{tricksWon}</span>
              </span>
            </>
          )}

          {/* Independent Bid Badge */}
          {independentBid !== null && (
            <>
              <span className="text-slate-600">•</span>
              <span
                className={`px-1.5 py-0.2 rounded font-black ${
                  independentBid > 10
                    ? 'bg-amber-400/25 border border-amber-400/80 text-amber-300 shadow-sm'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                Bid: {independentBid}
                {flexibleResponse?.action === 'pass' && ' (P)'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
