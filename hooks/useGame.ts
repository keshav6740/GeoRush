'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

    let wasAccepted = false;
    setGameState(prev => {
      const normalizedAnswer = normalizeText(country.name);
      const alreadyAnswered = prev.answers.some(
        existing => normalizeText(existing) === normalizedAnswer
      );
      if (alreadyAnswered) {
        return {
          ...prev,
          incorrect: prev.incorrect + 1,
        };
      }
      wasAccepted = true;
      return {
        ...prev,
        answers: [...prev.answers, country.name],
        score: prev.score + 1,
        correct: prev.correct + 1,
      };
    });
    return wasAccepted;
  }, []);

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

  // Refs to avoid stale closures in submitAnswer (Issue #8)
  const neighborsRef = useRef(neighbors);
  const gameEndedRef = useRef(gameEnded);
  neighborsRef.current = neighbors;
  gameEndedRef.current = gameEnded;

  useEffect(() => {
    const countryNeighbors = getNeighbors(startingCountry);
    setNeighbors(countryNeighbors);
  }, [startingCountry]);

  const submitAnswer = useCallback((answer: string): boolean => {
    const normalizedAnswer = normalizeText(answer);
    const currentNeighbors = neighborsRef.current;
    const matchedNeighbor = currentNeighbors.find(
      neighbor => normalizeText(neighbor) === normalizedAnswer
    );

    if (!matchedNeighbor) {
      if (!gameEndedRef.current) {
        setFailed(true);
        setGameEnded(true);
      }
      return false;
    }

    let wasAccepted = false;
    setAnswered(prev => {
      const alreadyHas = prev.some(a => normalizeText(a) === normalizedAnswer);
      if (alreadyHas) {
        return prev;
      }
      wasAccepted = true;
      const newAnswered = [...prev, matchedNeighbor];
      if (newAnswered.length === currentNeighbors.length) {
        setScore(s => s + 50);
        setGameEnded(true);
      }
      return newAnswered;
    });

    if (wasAccepted) {
      setScore(prev => prev + 10);
    } else if (!gameEndedRef.current) {
      setFailed(true);
      setGameEnded(true);
    }

    return wasAccepted;
  }, []);

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
