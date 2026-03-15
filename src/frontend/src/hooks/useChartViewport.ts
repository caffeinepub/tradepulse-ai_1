import { useCallback, useState } from "react";

const DEFAULT_CANDLE_WIDTH = 8;
const MIN_CANDLE_WIDTH = 4;
const MAX_CANDLE_WIDTH = 60;

interface UseChartViewportReturn {
  candleWidth: number;
  viewOffset: number;
  yScaleFactor: number;
  yPanOffset: number;
  freePanMode: boolean;
  handleWheel: (e: WheelEvent, mouseXFraction: number) => void;
  handlePanDelta: (deltaX: number) => void;
  handleYAxisDrag: (deltaY: number) => void;
  handleFreePanDelta: (dx: number, dy: number) => void;
  toggleFreePanMode: () => void;
  visibleCount: (plotWidth: number) => number;
}

export function useChartViewport(): UseChartViewportReturn {
  const [candleWidth, setCandleWidth] = useState(DEFAULT_CANDLE_WIDTH);
  const [viewOffset, setViewOffset] = useState(0);
  const [yScaleFactor, setYScaleFactor] = useState(1.0);
  const [yPanOffset, setYPanOffset] = useState(0);
  const [freePanMode, setFreePanMode] = useState(false);

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

  const handleYAxisDrag = useCallback((deltaY: number) => {
    // Dragging up (negative deltaY) = zoom in (increase scale factor)
    // Dragging down (positive deltaY) = zoom out (decrease scale factor)
    setYScaleFactor((prev) => {
      const factor = deltaY < 0 ? 1.02 : 0.98;
      return Math.max(0.1, Math.min(10, prev * factor));
    });
  }, []);

  const handleFreePanDelta = useCallback((dx: number, dy: number) => {
    // Horizontal pan uses existing mechanism
    setCandleWidth((prevCw) => {
      const deltaCandles = dx / prevCw;
      setViewOffset((prev) => Math.max(0, prev - Math.round(deltaCandles)));
      return prevCw;
    });
    // Vertical pan adjusts yPanOffset
    setYPanOffset((prev) => prev + dy);
  }, []);

  const toggleFreePanMode = useCallback(() => {
    setFreePanMode((prev) => {
      if (prev) {
        // Exiting free pan mode: reset vertical offset
        setYPanOffset(0);
      }
      return !prev;
    });
  }, []);

  return {
    candleWidth,
    viewOffset,
    yScaleFactor,
    yPanOffset,
    freePanMode,
    handleWheel,
    handlePanDelta,
    handleYAxisDrag,
    handleFreePanDelta,
    toggleFreePanMode,
    visibleCount,
  };
}
