'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCountryByName, getNeighbors, normalizeText } from '@/lib/countries';

export interface GameState {
  mode: string;
  score: number;
  correct: number;
  incorrect: number;
  timeRemaining: number;
  isRunning: boolean;
  currentCountry?: string;
  answers: string[];
}

export function useGame(initialMode: string, duration: number = 60) {
  const [gameState, setGameState] = useState<GameState>({
    mode: initialMode,
    score: 0,
    correct: 0,
    incorrect: 0,
    timeRemaining: duration,
    isRunning: false,
    answers: [],
  });

  // Timer effect
  useEffect(() => {
    if (!gameState.isRunning || gameState.timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        timeRemaining: Math.max(0, prev.timeRemaining - 1),
        isRunning: prev.timeRemaining - 1 > 0,
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.isRunning, gameState.timeRemaining]);

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isRunning: true,
      timeRemaining: duration,
    }));
  }, [duration]);

  const endGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isRunning: false,
    }));
  }, []);

  const addAnswer = useCallback((answer: string) => {
    const country = getCountryByName(answer);
    if (!country) {
      setGameState(prev => ({
        ...prev,
        incorrect: prev.incorrect + 1,
      }));
      return false;
    }

    const normalizedAnswer = normalizeText(country.name);
    const alreadyAnswered = gameState.answers.some(
      existing => normalizeText(existing) === normalizedAnswer
    );
    if (alreadyAnswered) {
      setGameState(prev => ({
        ...prev,
        incorrect: prev.incorrect + 1,
      }));
      return false; // Already answered
    }

    setGameState(prev => ({
      ...prev,
      answers: [...prev.answers, country.name],
      score: prev.score + 1,
      correct: prev.correct + 1,
    }));
    return true;
  }, [gameState.answers]);

  const setCurrentCountry = useCallback((country: string) => {
    setGameState(prev => ({
      ...prev,
      currentCountry: country,
    }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState({
      mode: initialMode,
      score: 0,
      correct: 0,
      incorrect: 0,
      timeRemaining: duration,
      isRunning: false,
      answers: [],
    });
  }, [initialMode, duration]);

  return {
    gameState,
    startGame,
    endGame,
    addAnswer,
    setCurrentCountry,
    resetGame,
  };
}

export function useNeighbourChain(startingCountry: string) {
  const [neighbors, setNeighbors] = useState<string[]>([]);
  const [answered, setAnswered] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const countryNeighbors = getNeighbors(startingCountry);
    setNeighbors(countryNeighbors);
  }, [startingCountry]);

  const submitAnswer = useCallback((answer: string): boolean => {
    const normalizedAnswer = normalizeText(answer);
    const matchedNeighbor = neighbors.find(
      neighbor => normalizeText(neighbor) === normalizedAnswer
    );

    if (!matchedNeighbor || answered.some(a => normalizeText(a) === normalizedAnswer)) {
      if (!gameEnded) {
        setFailed(true);
        setGameEnded(true);
      }
      return false;
    }

    const newAnswered = [...answered, matchedNeighbor];
    setAnswered(newAnswered);
    setScore(prev => prev + 10);

    // Check if got all neighbors
    if (newAnswered.length === neighbors.length) {
      setScore(prev => prev + 50); // Bonus for perfect
      setGameEnded(true);
    }

    return true;
  }, [answered, neighbors]);

  const getMissedNeighbors = useCallback((): string[] => {
    return neighbors.filter(n => !answered.includes(n));
  }, [neighbors, answered]);

  const reset = useCallback(() => {
    setAnswered([]);
    setScore(0);
    setGameEnded(false);
    setFailed(false);
  }, []);

  return {
    neighbors,
    answered,
    score,
    gameEnded,
    failed,
    submitAnswer,
    getMissedNeighbors,
    reset,
  };
}
