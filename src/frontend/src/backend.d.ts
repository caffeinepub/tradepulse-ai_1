import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TradePosition {
    closeTime?: bigint;
    entryTime: bigint;
    side: Variant_buy_sell;
    profitLoss?: number;
    closePrice?: number;
    quantity: number;
    entryPrice: number;
    symbol: string;
}
export interface AiSignal {
    generatedAt: bigint;
    signal: Variant_buy_hold_sell;
    confidence: number;
    symbol: string;
}
export interface UserProfile {
    balance: number;
    displayName: string;
    tradeHistory: Array<TradePosition>;
    email: string;
    openPositions: Array<TradePosition>;
}
export interface MarketData {
    timestamp: bigint;
    price: number;
    symbol: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_buy_hold_sell {
    buy = "buy",
    hold = "hold",
    sell = "sell"
}
export enum Variant_buy_sell {
    buy = "buy",
    sell = "sell"
}
export interface backendInterface {
    addMarketData(data: MarketData): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    generateAiSignal(symbol: string, signal: Variant_buy_hold_sell, confidence: number): Promise<void>;
    getAiSignal(symbol: string): Promise<AiSignal>;
    getCallerUserProfile(): Promise<UserProfile>;
    getCallerUserRole(): Promise<UserRole>;
    getDashboardStats(user: Principal): Promise<{
        totalTrades: bigint;
        openEquity: number;
        balance: number;
        winRate: number;
    }>;
    getMarketData(symbol: string): Promise<Array<MarketData>>;
    getUserProfile(user: Principal): Promise<UserProfile>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
