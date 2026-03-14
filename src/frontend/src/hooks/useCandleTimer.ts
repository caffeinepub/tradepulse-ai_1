import { useCallback, useEffect, useRef, useState } from "react";

const TIMEFRAME_DURATIONS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1H": 3600,
  "4H": 14400,
  "1D": 86400,
};

export function useCandleTimer(
  timeframe: string,
  onNewCandle: () => void,
): { secondsRemaining: number; progress: number } {
  const duration = TIMEFRAME_DURATIONS[timeframe] ?? 60;

  const computeSecondsRemaining = useCallback(() => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const elapsed = nowSeconds % duration;
    return duration - elapsed;
  }, [duration]);

  const [secondsRemaining, setSecondsRemaining] = useState(
    computeSecondsRemaining,
  );

  const onNewCandleRef = useRef(onNewCandle);
  onNewCandleRef.current = onNewCandle;

  useEffect(() => {
    setSecondsRemaining(computeSecondsRemaining());

    const id = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          onNewCandleRef.current();
          return computeSecondsRemaining();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [computeSecondsRemaining]);

  const progress = ((duration - secondsRemaining) / duration) * 100;

  return { secondsRemaining, progress };
}
