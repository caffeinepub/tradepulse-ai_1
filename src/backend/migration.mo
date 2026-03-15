import Map "mo:core/Map";
import Text "mo:core/Text";
import Principal "mo:core/Principal";

module {
  type TradePosition = {
    symbol : Text;
    side : { #buy; #sell };
    quantity : Float;
    entryPrice : Float;
    entryTime : Int;
    closePrice : ?Float;
    closeTime : ?Int;
    profitLoss : ?Float;
  };

  type MarketData = {
    symbol : Text;
    price : Float;
    timestamp : Int;
  };

  type AiSignal = {
    symbol : Text;
    signal : { #buy; #sell; #hold };
    confidence : Float;
    generatedAt : Int;
  };

  type UserProfile = {
    displayName : Text;
    email : Text;
    balance : Float;
    openPositions : [TradePosition];
    tradeHistory : [TradePosition];
  };

  type OldActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    marketDataRecords : Map.Map<Text, [MarketData]>;
    aiSignals : Map.Map<Text, AiSignal>;
  };

  type NewActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    marketDataRecords : Map.Map<Text, [MarketData]>;
    aiSignals : Map.Map<Text, AiSignal>;
  };

  public func run(old : OldActor) : NewActor {
    {
      userProfiles = old.userProfiles;
      marketDataRecords = old.marketDataRecords;
      aiSignals = old.aiSignals;
    };
  };
};
