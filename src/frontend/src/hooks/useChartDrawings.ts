import { useCallback, useState } from "react";
import type { Drawing, DrawingTool } from "../types/drawing";

function generateId(): string {
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface UseChartDrawingsReturn {
  drawings: Drawing[];
  activeTool: DrawingTool;
  selectedDrawingId: string | null;
  drawingInProgress: Drawing | null;
  setActiveTool: (tool: DrawingTool) => void;
  addDrawing: (drawing: Drawing) => void;
  updateDrawing: (id: string, updates: Partial<Drawing>) => void;
  deleteDrawing: (id: string) => void;
  selectDrawing: (id: string | null) => void;
  setDrawingInProgress: (drawing: Drawing | null) => void;
  generateId: () => string;
}

export function useChartDrawings(
  symbol: string,
  timeframe: string,
): UseChartDrawingsReturn {
  const key = `${symbol}_${timeframe}`;
  const [allDrawings, setAllDrawings] = useState<Record<string, Drawing[]>>({});
  const [activeTool, setActiveTool] = useState<DrawingTool>("cursor");
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(
    null,
  );
  const [drawingInProgress, setDrawingInProgress] = useState<Drawing | null>(
    null,
  );

  const drawings = allDrawings[key] ?? [];

  const addDrawing = useCallback(
    (drawing: Drawing) => {
      setAllDrawings((prev) => ({
        ...prev,
        [key]: [...(prev[key] ?? []), drawing],
      }));
    },
    [key],
  );

  const updateDrawing = useCallback(
    (id: string, updates: Partial<Drawing>) => {
      setAllDrawings((prev) => ({
        ...prev,
        [key]: (prev[key] ?? []).map((d) =>
          d.id === id ? ({ ...d, ...updates } as Drawing) : d,
        ),
      }));
    },
    [key],
  );

  const deleteDrawing = useCallback(
    (id: string) => {
      setAllDrawings((prev) => ({
        ...prev,
        [key]: (prev[key] ?? []).filter((d) => d.id !== id),
      }));
      setSelectedDrawingId((prev) => (prev === id ? null : prev));
    },
    [key],
  );

  const selectDrawing = useCallback((id: string | null) => {
    setSelectedDrawingId(id);
  }, []);

  return {
    drawings,
    activeTool,
    selectedDrawingId,
    drawingInProgress,
    setActiveTool,
    addDrawing,
    updateDrawing,
    deleteDrawing,
    selectDrawing,
    setDrawingInProgress,
    generateId,
  };
}
