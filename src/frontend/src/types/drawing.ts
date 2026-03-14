export type DrawingTool =
  | "cursor"
  | "trendline"
  | "hline"
  | "rectangle"
  | "fibonacci";

export interface DrawingPoint {
  candleIndex: number; // absolute index into full candle array
  price: number;
}

export interface TrendlineDrawing {
  id: string;
  type: "trendline";
  start: DrawingPoint;
  end: DrawingPoint;
  color: string;
}

export interface HlineDrawing {
  id: string;
  type: "hline";
  price: number;
  color: string;
}

export interface RectangleDrawing {
  id: string;
  type: "rectangle";
  start: DrawingPoint;
  end: DrawingPoint;
  color: string;
}

export interface FibonacciDrawing {
  id: string;
  type: "fibonacci";
  start: DrawingPoint; // high point
  end: DrawingPoint; // low point
  color: string;
}

export type Drawing =
  | TrendlineDrawing
  | HlineDrawing
  | RectangleDrawing
  | FibonacciDrawing;

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 1.0];
