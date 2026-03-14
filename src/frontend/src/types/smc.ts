export interface LiquidityZone {
  id: string;
  type: "buy" | "sell";
  priceHigh: number;
  priceLow: number;
  startIndex: number;
  active: boolean;
}

export interface OrderBlock {
  id: string;
  type: "bull" | "bear";
  open: number;
  close: number;
  high: number;
  low: number;
  index: number;
  mitigated: boolean;
}

export interface BOSCHOCHEvent {
  id: string;
  type: "BOS" | "CHOCH";
  direction: "up" | "down";
  price: number;
  index: number;
}

export interface FVGZone {
  id: string;
  type: "bull" | "bear";
  high: number;
  low: number;
  startIndex: number;
  filled: boolean;
}

export interface SMCData {
  liquidityZones: LiquidityZone[];
  orderBlocks: OrderBlock[];
  bosChochEvents: BOSCHOCHEvent[];
  fvgZones: FVGZone[];
}

export interface SMCVisibility {
  liquidityZones: boolean;
  orderBlocks: boolean;
  bosChoch: boolean;
  fvg: boolean;
}

export interface SMCSignalContext {
  nearOrderBlock: boolean;
  atLiquiditySweep: boolean;
  bosConfirmed: boolean;
  chochWarning: boolean;
}

export interface FactorWeights {
  trendAlignment: number;
  indicatorConfluence: number;
  volumeConfirmation: number;
  structureSignals: number;
  liquidityZone: number;
  orderBlock: number;
  sentiment: number;
}
