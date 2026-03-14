import { useEffect, useRef, useState } from "react";
import {
  type NewsItem,
  type SentimentLabel,
  fetchHeadlines,
} from "../utils/newsService";

export interface SentimentState {
  headlines: NewsItem[];
  overallSentiment: SentimentLabel;
  sentimentStrength: number;
}

const EMPTY_STATE: SentimentState = {
  headlines: [],
  overallSentiment: "Neutral",
  sentimentStrength: 50,
};

function computeSentiment(
  headlines: NewsItem[],
): Pick<SentimentState, "overallSentiment" | "sentimentStrength"> {
  if (headlines.length === 0)
    return { overallSentiment: "Neutral", sentimentStrength: 50 };

  let bullishSum = 0;
  let bearishSum = 0;
  let total = 0;

  for (const item of headlines) {
    total++;
    if (item.sentiment === "Bullish") bullishSum += item.sentimentScore;
    else if (item.sentiment === "Bearish") bearishSum += item.sentimentScore;
  }

  const bullishAvg = bullishSum / (total * 100);
  const bearishAvg = bearishSum / (total * 100);
  const net = bullishAvg - bearishAvg; // -1 to +1
  const rawScore = Math.round((net + 1) * 50); // 0-100
  const score = Math.max(0, Math.min(100, rawScore));

  let overallSentiment: SentimentLabel;
  if (score > 55) overallSentiment = "Bullish";
  else if (score < 45) overallSentiment = "Bearish";
  else overallSentiment = "Neutral";

  const sentimentStrength =
    overallSentiment === "Bullish"
      ? score
      : overallSentiment === "Bearish"
        ? 100 - score
        : Math.abs(score - 50) * 2 + 40;

  return { overallSentiment, sentimentStrength: Math.round(sentimentStrength) };
}

export function useNewsSentiment(symbol: string): SentimentState {
  const [state, setState] = useState<SentimentState>(EMPTY_STATE);
  const prevSymbolRef = useRef(symbol);

  useEffect(() => {
    if (prevSymbolRef.current !== symbol) {
      prevSymbolRef.current = symbol;
      setState(EMPTY_STATE);
    }

    const refresh = () => {
      const headlines = fetchHeadlines(symbol);
      const sentiment = computeSentiment(headlines);
      setState({ headlines, ...sentiment });
    };

    refresh();
    const id = setInterval(refresh, 45000);
    return () => clearInterval(id);
  }, [symbol]);

  return state;
}
