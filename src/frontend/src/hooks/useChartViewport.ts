import { useCallback, useRef, useState } from "react";

const DEFAULT_VISIBLE_COUNT = 50;
const MIN_VISIBLE_COUNT = 10;
const MAX_VISIBLE_COUNT = 200;
const ZOOM_STEP_RATIO = 0.1; // 10% per scroll tick

interface UseChartViewportReturn {
  candleWidth: number;
  visibleCount: number;
  viewOffset: number;
  yScaleFactor: number;
  yPanOffset: number;
  freePanMode: boolean;
  handleWheel: (e: WheelEvent, mouseXFraction: number) => void;
  handlePanDelta: (deltaX: number) => void;
  handleYAxisDrag: (deltaY: number) => void;
  handleFreePanDelta: (dx: number, dy: number) => void;
  toggleFreePanMode: () => void;
  setContainerWidth: (w: number) => void;
}

export function useChartViewport(): UseChartViewportReturn {
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);
  const [viewOffset, setViewOffset] = useState(0);
  const [yScaleFactor, setYScaleFactor] = useState(1.0);
  const [yPanOffset, setYPanOffset] = useState(0);
  const [freePanMode, setFreePanMode] = useState(false);

  const containerWidthRef = useRef(800);

  const setContainerWidth = useCallback((w: number) => {
    if (w > 0) containerWidthRef.current = w;
  }, []);

  // Derived: candleWidth = containerWidth / visibleCount
  const candleWidth = containerWidthRef.current / visibleCount;

  const handleWheel = useCallback((e: WheelEvent, mouseXFraction: number) => {
    if (e.ctrlKey) {
      // Vertical zoom via Ctrl+scroll
      setYScaleFactor((prev) => {
        const factor = e.deltaY > 0 ? 0.95 : 1.05;
        return Math.max(0.1, Math.min(10, prev * factor));
      });
      return;
    }

    // Horizontal zoom
    setVisibleCount((prev) => {
      const step = Math.max(1, Math.round(prev * ZOOM_STEP_RATIO));
      // scroll down = zoom out (more candles), scroll up = zoom in (fewer candles)
      const next = e.deltaY > 0 ? prev + step : prev - step;
      const clamped = Math.max(
        MIN_VISIBLE_COUNT,
        Math.min(MAX_VISIBLE_COUNT, next),
      );
      const countDelta = clamped - prev;

      // Anchor zoom to cursor position
      if (countDelta !== 0) {
        setViewOffset((prevOffset) => {
          const adjustment = Math.round(countDelta * mouseXFraction);
          return Math.max(0, prevOffset + adjustment);
        });
      }

      return clamped;
    });
  }, []);

  const handlePanDelta = useCallback((deltaX: number) => {
    const cw = containerWidthRef.current / DEFAULT_VISIBLE_COUNT; // use ref-based cw
    const deltaCandles = deltaX / cw;
    setViewOffset((prev) => Math.max(0, prev - Math.round(deltaCandles)));
  }, []);

  const handleYAxisDrag = useCallback((deltaY: number) => {
    setYScaleFactor((prev) => {
      const factor = deltaY < 0 ? 1.02 : 0.98;
      return Math.max(0.1, Math.min(10, prev * factor));
    });
  }, []);

  const handleFreePanDelta = useCallback((dx: number, dy: number) => {
    const cw = containerWidthRef.current / DEFAULT_VISIBLE_COUNT;
    const deltaCandles = dx / cw;
    setViewOffset((prev) => Math.max(0, prev - Math.round(deltaCandles)));
    setYPanOffset((prev) => prev + dy);
  }, []);

  const toggleFreePanMode = useCallback(() => {
    setFreePanMode((prev) => {
      if (prev) {
        setYPanOffset(0);
      }
      return !prev;
    });
  }, []);

  return {
    candleWidth,
    visibleCount,
    viewOffset,
    yScaleFactor,
    yPanOffset,
    freePanMode,
    handleWheel,
    handlePanDelta,
    handleYAxisDrag,
    handleFreePanDelta,
    toggleFreePanMode,
    setContainerWidth,
  };
}
