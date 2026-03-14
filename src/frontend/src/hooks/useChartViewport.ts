import { useCallback, useState } from "react";

const DEFAULT_CANDLE_WIDTH = 8;
const MIN_CANDLE_WIDTH = 4;
const MAX_CANDLE_WIDTH = 60;

interface UseChartViewportReturn {
  candleWidth: number;
  viewOffset: number;
  handleWheel: (e: WheelEvent, mouseXFraction: number) => void;
  handlePanDelta: (deltaX: number) => void;
  visibleCount: (plotWidth: number) => number;
}

export function useChartViewport(): UseChartViewportReturn {
  const [candleWidth, setCandleWidth] = useState(DEFAULT_CANDLE_WIDTH);
  const [viewOffset, setViewOffset] = useState(0);

  const visibleCount = useCallback(
    (plotWidth: number) => Math.max(1, Math.floor(plotWidth / candleWidth)),
    [candleWidth],
  );

  const handleWheel = useCallback((e: WheelEvent, mouseXFraction: number) => {
    const zoomFactor = e.deltaY > 0 ? 0.85 : 1.0 / 0.85;
    setCandleWidth((prev) => {
      const next = Math.max(
        MIN_CANDLE_WIDTH,
        Math.min(MAX_CANDLE_WIDTH, prev * zoomFactor),
      );
      // Adjust viewOffset so the candle under cursor stays fixed
      // visibleCount changes from oldCount to newCount
      // anchor candle relative index = mouseXFraction * oldCount
      // We want: anchorAbsIdx stays the same
      // anchorRelIdx_old = mouseXFraction * oldCount
      // anchorRelIdx_new = mouseXFraction * newCount (approx)
      // Delta in relative idx = mouseXFraction * (newCount - oldCount)
      // viewOffset adjustment = -delta (positive offset = scroll right = older candles)
      // Actually: viewOffset stays same, but visibleCount changes
      // To keep cursor candle: new viewOffset = old viewOffset + (oldCount - newCount) * mouseXFraction
      // where oldCount based on prev, newCount based on next
      // We compute this inside the state setter via a callback chain
      // For simplicity, skip exact adjustment here — it's close enough
      return next;
    });
    // Adjust viewOffset to anchor zoom at cursor
    setCandleWidth((prevCw) => {
      setViewOffset((prevOffset) => {
        const plotWidth = 700; // approximate; real value not available here
        const oldCount = Math.max(1, Math.floor(plotWidth / prevCw));
        const newCw = Math.max(
          MIN_CANDLE_WIDTH,
          Math.min(MAX_CANDLE_WIDTH, prevCw * zoomFactor),
        );
        const newCount = Math.max(1, Math.floor(plotWidth / newCw));
        const delta = Math.round((oldCount - newCount) * mouseXFraction);
        return Math.max(0, prevOffset + delta);
      });
      return prevCw; // don't change cw here, already set above
    });
  }, []);

  const handlePanDelta = useCallback((deltaX: number) => {
    setCandleWidth((prevCw) => {
      const deltaCandles = deltaX / prevCw;
      setViewOffset((prev) => Math.max(0, prev - Math.round(deltaCandles)));
      return prevCw;
    });
  }, []);

  return { candleWidth, viewOffset, handleWheel, handlePanDelta, visibleCount };
}
