'use client';

import { SporcleCountryQuiz } from '@/components/game/SporcleCountryQuiz';
import { COUNTRY_NAMES } from '@/lib/countries';

export default function WorldQuizPage() {
  return (
    <SporcleCountryQuiz
      gameMode="World Quiz"
      title="World Country Quiz"
      subtitle="Guess every country in the world in 15 minutes."
      targetCountries={COUNTRY_NAMES}
      durationSeconds={15 * 60}
      backHref="/modes"
      emphasizeMap
      mapHeightClass="h-[460px] md:h-[780px]"
      inputFirst
      showRecentGuesses={false}
    />
  );
}
