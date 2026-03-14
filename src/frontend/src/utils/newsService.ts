export type SentimentLabel = "Bullish" | "Bearish" | "Neutral";

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  timestamp: Date;
  assetClass: "crypto" | "forex" | "gold" | "indices";
  sentiment: SentimentLabel;
  sentimentScore: number;
}

function getAssetClass(
  symbol: string,
): "crypto" | "forex" | "gold" | "indices" {
  const s = symbol.toUpperCase().replace("/", "");
  if (
    /^(BTC|ETH|BNB|SOL|XRP|ADA|DOGE|MATIC|DOT|LTC|AVAX|LINK|UNI|ATOM|NEAR)/.test(
      s,
    )
  )
    return "crypto";
  if (/^(XAUUSD|XAGUSD|GOLD|SILVER)/.test(s)) return "gold";
  if (/^(SPX|NAS|DJ|DAX|FTSE|NIKKEI|HSI|S&P|US500|US100|UK100|GER40)/.test(s))
    return "indices";
  return "forex";
}

const HEADLINE_POOLS: Record<
  "crypto" | "forex" | "gold" | "indices",
  {
    headline: string;
    source: string;
    sentiment: SentimentLabel;
    sentimentScore: number;
  }[]
> = {
  crypto: [
    {
      headline:
        "Bitcoin breaks above key resistance at $68,000, bulls eye all-time high",
      source: "CoinDesk",
      sentiment: "Bullish",
      sentimentScore: 82,
    },
    {
      headline: "ETF inflows hit record $1.2B as institutional demand surges",
      source: "Bloomberg",
      sentiment: "Bullish",
      sentimentScore: 88,
    },
    {
      headline: "Ethereum developers confirm next upgrade timeline for Q2",
      source: "The Block",
      sentiment: "Bullish",
      sentimentScore: 74,
    },
    {
      headline:
        "Crypto market cap surpasses $2.5 trillion amid risk-on sentiment",
      source: "Reuters",
      sentiment: "Bullish",
      sentimentScore: 79,
    },
    {
      headline:
        "On-chain data shows whale accumulation at current price levels",
      source: "Glassnode",
      sentiment: "Bullish",
      sentimentScore: 71,
    },
    {
      headline:
        "Bitcoin mining difficulty reaches record high as hashrate climbs",
      source: "CryptoSlate",
      sentiment: "Neutral",
      sentimentScore: 52,
    },
    {
      headline: "DeFi total value locked stabilizes near $80B support zone",
      source: "DeFiPulse",
      sentiment: "Neutral",
      sentimentScore: 50,
    },
    {
      headline:
        "Stablecoin transfers see slight uptick as traders hedge positions",
      source: "Nansen",
      sentiment: "Neutral",
      sentimentScore: 48,
    },
    {
      headline:
        "Regulatory uncertainty weighs on crypto market as SEC delays ETF decision",
      source: "WSJ",
      sentiment: "Bearish",
      sentimentScore: 71,
    },
    {
      headline: "Bitcoin drops 8% after whale moves 10,000 BTC to exchanges",
      source: "CoinTelegraph",
      sentiment: "Bearish",
      sentimentScore: 78,
    },
    {
      headline: "Crypto lender liquidations spike as market volatility rises",
      source: "Bloomberg",
      sentiment: "Bearish",
      sentimentScore: 75,
    },
    {
      headline:
        "Mt. Gox trustee transfers large BTC holdings, sparking sell-off fears",
      source: "Decrypt",
      sentiment: "Bearish",
      sentimentScore: 80,
    },
    {
      headline: "Altcoins bleed as Bitcoin dominance climbs above 54%",
      source: "CoinMarketCap",
      sentiment: "Bearish",
      sentimentScore: 65,
    },
    {
      headline:
        "Fed minutes signal higher-for-longer rates, crypto reacts negatively",
      source: "Reuters",
      sentiment: "Bearish",
      sentimentScore: 73,
    },
    {
      headline: "Binance weekly options expiry approaches $4B in open interest",
      source: "Deribit",
      sentiment: "Neutral",
      sentimentScore: 51,
    },
    {
      headline:
        "Layer 2 networks process record transactions as gas fees normalize",
      source: "L2Beat",
      sentiment: "Bullish",
      sentimentScore: 68,
    },
    {
      headline:
        "Grayscale BTC trust discount narrows as conversion demand grows",
      source: "Bloomberg",
      sentiment: "Bullish",
      sentimentScore: 76,
    },
    {
      headline:
        "South Korea tightens crypto exchange oversight amid compliance review",
      source: "Reuters",
      sentiment: "Bearish",
      sentimentScore: 62,
    },
    {
      headline: "Solana validators approve governance vote for network upgrade",
      source: "Solana Foundation",
      sentiment: "Bullish",
      sentimentScore: 70,
    },
    {
      headline:
        "Options market pricing 30-day BTC volatility at multi-month low",
      source: "Deribit",
      sentiment: "Neutral",
      sentimentScore: 50,
    },
    {
      headline: "Crypto VC funding rebounds to $2.1B in Q1, highest since 2022",
      source: "PitchBook",
      sentiment: "Bullish",
      sentimentScore: 77,
    },
    {
      headline: "Bitcoin long-term holder supply rises to 14.9M BTC",
      source: "Glassnode",
      sentiment: "Bullish",
      sentimentScore: 72,
    },
    {
      headline: "Tether mints $500M USDT as demand for dollar exposure grows",
      source: "CoinDesk",
      sentiment: "Neutral",
      sentimentScore: 53,
    },
    {
      headline: "Crypto funds see third consecutive week of outflows",
      source: "CoinShares",
      sentiment: "Bearish",
      sentimentScore: 67,
    },
    {
      headline:
        "Ethereum staking ratio drops as validators exit amid low yields",
      source: "Dune Analytics",
      sentiment: "Bearish",
      sentimentScore: 63,
    },
  ],
  forex: [
    {
      headline: "Dollar strengthens as US jobs data beats expectations",
      source: "Reuters",
      sentiment: "Bullish",
      sentimentScore: 78,
    },
    {
      headline: "EUR/USD falls below 1.08 as ECB signals rate pause ahead",
      source: "FXStreet",
      sentiment: "Bearish",
      sentimentScore: 74,
    },
    {
      headline: "GBP rallies after UK inflation cools more than expected",
      source: "Bloomberg",
      sentiment: "Bullish",
      sentimentScore: 72,
    },
    {
      headline:
        "JPY hits 34-year low as BoJ maintains ultra-loose policy stance",
      source: "Nikkei",
      sentiment: "Bearish",
      sentimentScore: 80,
    },
    {
      headline:
        "Fed Chair signals willingness to keep rates elevated through mid-year",
      source: "WSJ",
      sentiment: "Bullish",
      sentimentScore: 76,
    },
    {
      headline:
        "Euro zone PMI data misses forecasts, raising recession concerns",
      source: "Markit",
      sentiment: "Bearish",
      sentimentScore: 71,
    },
    {
      headline:
        "DXY index holds above 105 support as risk-off sentiment persists",
      source: "Reuters",
      sentiment: "Bullish",
      sentimentScore: 69,
    },
    {
      headline:
        "USD/JPY intervention risk rises as Japanese officials issue warning",
      source: "Bloomberg",
      sentiment: "Neutral",
      sentimentScore: 50,
    },
    {
      headline: "UK GDP growth beats estimates, supporting pound outlook",
      source: "ONS",
      sentiment: "Bullish",
      sentimentScore: 73,
    },
    {
      headline: "Swiss franc weakens as SNB surprises with rate cut",
      source: "Reuters",
      sentiment: "Bearish",
      sentimentScore: 77,
    },
    {
      headline:
        "AUD/USD recovers as China stimulus measures boost risk appetite",
      source: "FX Daily",
      sentiment: "Bullish",
      sentimentScore: 70,
    },
    {
      headline:
        "Eurozone CPI ticks higher, ECB rate cut expectations pushed back",
      source: "Eurostat",
      sentiment: "Neutral",
      sentimentScore: 52,
    },
    {
      headline: "US trade deficit widens, pressuring dollar in near term",
      source: "BLS",
      sentiment: "Bearish",
      sentimentScore: 63,
    },
    {
      headline: "Canadian dollar slips after BoC signals rate cut timeline",
      source: "Globe and Mail",
      sentiment: "Bearish",
      sentimentScore: 68,
    },
    {
      headline: "EM currencies rally as dollar pressure eases",
      source: "Bloomberg EM",
      sentiment: "Bullish",
      sentimentScore: 67,
    },
    {
      headline: "FX options market shows dollar bulls dominate positioning",
      source: "CFTC",
      sentiment: "Bullish",
      sentimentScore: 74,
    },
    {
      headline:
        "NZD weakens after RBNZ leaves rates unchanged with dovish tone",
      source: "Reuters",
      sentiment: "Bearish",
      sentimentScore: 65,
    },
    {
      headline: "USD/CNY approaches 7.25 as PBOC maintains stability",
      source: "Xinhua",
      sentiment: "Neutral",
      sentimentScore: 51,
    },
    {
      headline: "EUR/GBP breaks key technical level on EU-UK trade tensions",
      source: "FX Weekly",
      sentiment: "Bearish",
      sentimentScore: 66,
    },
    {
      headline: "Dollar demand firm ahead of FOMC minutes release this week",
      source: "Investing.com",
      sentiment: "Bullish",
      sentimentScore: 71,
    },
  ],
  gold: [
    {
      headline: "Gold surges to record $2,400 as safe-haven demand spikes",
      source: "Bloomberg",
      sentiment: "Bullish",
      sentimentScore: 89,
    },
    {
      headline:
        "Central banks add 290 tonnes of gold in Q1, highest in a decade",
      source: "WGC",
      sentiment: "Bullish",
      sentimentScore: 85,
    },
    {
      headline: "XAUUSD breaks above $2,350 as Middle East tensions escalate",
      source: "Reuters",
      sentiment: "Bullish",
      sentimentScore: 83,
    },
    {
      headline:
        "Real yields fall as inflation expectations rise, gold benefits",
      source: "FT",
      sentiment: "Bullish",
      sentimentScore: 78,
    },
    {
      headline: "Gold ETF inflows turn positive for first time in six months",
      source: "WGC",
      sentiment: "Bullish",
      sentimentScore: 76,
    },
    {
      headline:
        "Precious metals consolidate as dollar recovers from monthly lows",
      source: "Kitco",
      sentiment: "Neutral",
      sentimentScore: 51,
    },
    {
      headline: "Gold prices steady ahead of US CPI data release",
      source: "Reuters",
      sentiment: "Neutral",
      sentimentScore: 50,
    },
    {
      headline:
        "Silver/gold ratio at 80, suggesting silver potential catch-up play",
      source: "Mining Weekly",
      sentiment: "Neutral",
      sentimentScore: 53,
    },
    {
      headline: "Strong US jobs report pressures gold below $2,300 support",
      source: "Bloomberg",
      sentiment: "Bearish",
      sentimentScore: 73,
    },
    {
      headline:
        "Gold ETF outflows accelerate as rates-higher narrative returns",
      source: "WGC",
      sentiment: "Bearish",
      sentimentScore: 70,
    },
    {
      headline: "Dollar strength weighs on commodities, gold drops 1.5%",
      source: "FT",
      sentiment: "Bearish",
      sentimentScore: 72,
    },
    {
      headline: "Hawkish Fed commentary caps gold rally near resistance zone",
      source: "Kitco",
      sentiment: "Bearish",
      sentimentScore: 68,
    },
    {
      headline:
        "Profit-taking emerges at $2,380 as gold overbought signals flash",
      source: "TechAnalysis",
      sentiment: "Bearish",
      sentimentScore: 64,
    },
    {
      headline: "India gold imports surge 18% ahead of wedding season",
      source: "Reuters",
      sentiment: "Bullish",
      sentimentScore: 74,
    },
    {
      headline: "Mining output falls 3% in Q1 amid operational disruptions",
      source: "Mining Journal",
      sentiment: "Bullish",
      sentimentScore: 67,
    },
    {
      headline: "Options market shows growing demand for XAUUSD call options",
      source: "CME Group",
      sentiment: "Bullish",
      sentimentScore: 71,
    },
    {
      headline: "Geopolitical risk premium fades as ceasefire talks progress",
      source: "Reuters",
      sentiment: "Bearish",
      sentimentScore: 65,
    },
    {
      headline: "COMEX gold positioning shows net longs near 6-month high",
      source: "CFTC",
      sentiment: "Bullish",
      sentimentScore: 75,
    },
  ],
  indices: [
    {
      headline: "S&P 500 hits all-time high as mega-cap tech earnings beat",
      source: "CNBC",
      sentiment: "Bullish",
      sentimentScore: 86,
    },
    {
      headline: "Nasdaq surges 2% as AI sector momentum continues",
      source: "Bloomberg",
      sentiment: "Bullish",
      sentimentScore: 84,
    },
    {
      headline: "Dow Jones extends gains as Fed pivot expectations grow",
      source: "Reuters",
      sentiment: "Bullish",
      sentimentScore: 78,
    },
    {
      headline: "VIX fear index falls to 13 as market complacency rises",
      source: "CBOE",
      sentiment: "Bullish",
      sentimentScore: 72,
    },
    {
      headline:
        "Corporate buyback programs accelerate, supporting equity prices",
      source: "Goldman Sachs",
      sentiment: "Bullish",
      sentimentScore: 74,
    },
    {
      headline:
        "PMI data shows manufacturing expansion for third straight month",
      source: "ISM",
      sentiment: "Bullish",
      sentimentScore: 76,
    },
    {
      headline:
        "European equities stabilize as ECB policy path becomes clearer",
      source: "FT",
      sentiment: "Neutral",
      sentimentScore: 52,
    },
    {
      headline: "Index rotation from growth to value as rates normalize",
      source: "Bloomberg",
      sentiment: "Neutral",
      sentimentScore: 50,
    },
    {
      headline: "Earnings season kicks off with mixed results from financials",
      source: "Reuters",
      sentiment: "Neutral",
      sentimentScore: 51,
    },
    {
      headline: "S&P 500 drops 1.8% as Treasury yields spike above 4.8%",
      source: "CNBC",
      sentiment: "Bearish",
      sentimentScore: 77,
    },
    {
      headline:
        "Tech selloff deepens as rate-sensitive valuations come under pressure",
      source: "WSJ",
      sentiment: "Bearish",
      sentimentScore: 75,
    },
    {
      headline: "Recession fears resurface as yield curve inversion deepens",
      source: "Bloomberg",
      sentiment: "Bearish",
      sentimentScore: 79,
    },
    {
      headline:
        "Consumer confidence drops to 3-month low amid inflation worries",
      source: "Conference Board",
      sentiment: "Bearish",
      sentimentScore: 71,
    },
    {
      headline:
        "Margin debt falls sharply, indicating deleveraging in equities",
      source: "FINRA",
      sentiment: "Bearish",
      sentimentScore: 68,
    },
    {
      headline: "Small caps underperform as credit conditions tighten",
      source: "Reuters",
      sentiment: "Bearish",
      sentimentScore: 66,
    },
    {
      headline:
        "DAX retreats from record as German industrial output disappoints",
      source: "Destatis",
      sentiment: "Bearish",
      sentimentScore: 67,
    },
    {
      headline: "FTSE 100 buoyed by energy and mining sector outperformance",
      source: "Bloomberg",
      sentiment: "Bullish",
      sentimentScore: 73,
    },
    {
      headline: "Japan Nikkei gains on yen weakness, exporters rally",
      source: "Nikkei",
      sentiment: "Bullish",
      sentimentScore: 70,
    },
    {
      headline: "Global equities mixed as investors await key inflation data",
      source: "Reuters",
      sentiment: "Neutral",
      sentimentScore: 50,
    },
    {
      headline: "Hedge funds reduce net equity exposure to lowest since 2022",
      source: "Goldman Sachs",
      sentiment: "Bearish",
      sentimentScore: 65,
    },
  ],
};

function getRandomTimestamp(maxMinutesAgo: number): Date {
  const now = Date.now();
  const offset = Math.floor(Math.random() * maxMinutesAgo * 60 * 1000);
  return new Date(now - offset);
}

export function fetchHeadlines(asset: string): NewsItem[] {
  const assetClass = getAssetClass(asset);
  const pool = HEADLINE_POOLS[assetClass];

  // Shuffle pool
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count = 6 + Math.floor(Math.random() * 3); // 6-8 items
  const selected = shuffled.slice(0, count);

  return selected.map((item, idx) => ({
    id: `${assetClass}-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    headline: item.headline,
    source: item.source,
    timestamp: getRandomTimestamp(120),
    assetClass,
    sentiment: item.sentiment,
    sentimentScore: item.sentimentScore,
  }));
}
