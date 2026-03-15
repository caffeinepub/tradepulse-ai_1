import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Float "mo:core/Float";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
actor {
  // Types
  public type TradePosition = {
    symbol : Text;
    side : { #buy; #sell };
    quantity : Float;
    entryPrice : Float;
    entryTime : Int;
    closePrice : ?Float;
    closeTime : ?Int;
    profitLoss : ?Float;
  };

  public type MarketData = {
    symbol : Text;
    price : Float;
    timestamp : Int;
  };

  public type AiSignal = {
    symbol : Text;
    signal : { #buy; #sell; #hold };
    confidence : Float;
    generatedAt : Int;
  };

  public type UserProfile = {
    displayName : Text;
    email : Text;
    balance : Float;
    openPositions : [TradePosition];
    tradeHistory : [TradePosition];
  };

  public type AdminStats = {
    totalUsers : Nat;
    totalTrades : Nat;
    premiumUsers : Nat;
    freeUsers : Nat;
    platformWinRate : Float;
    mostTradedSymbol : Text;
  };

  module MarketData {
    public func compare(a : MarketData, b : MarketData) : Order.Order {
      Text.compare(a.symbol, b.symbol);
    };
  };

  // State
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let userProfiles = Map.empty<Principal, UserProfile>();
  let marketDataRecords = Map.empty<Text, [MarketData]>();
  let aiSignals = Map.empty<Text, AiSignal>();

  // Initial market data
  let initialMarketData : [MarketData] = [
    { symbol = "BTC"; price = 50000.0; timestamp = Time.now() },
    { symbol = "ETH"; price = 3500.0; timestamp = Time.now() },
    { symbol = "SOLO"; price = 150.0; timestamp = Time.now() },
    { symbol = "EUR/USD"; price = 1.25; timestamp = Time.now() },
    { symbol = "GBP/USD"; price = 1.40; timestamp = Time.now() },
    { symbol = "XAU/USD"; price = 1700.0; timestamp = Time.now() },
    { symbol = "SPX"; price = 4400.0; timestamp = Time.now() },
    { symbol = "NDX"; price = 15000.0; timestamp = Time.now() },
  ];

  // User profile functions
  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    switch (userProfiles.get(user)) {
      case (?u) { u };
      case (null) { Runtime.trap("Profile does not exist") };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    switch (userProfiles.get(caller)) {
      case (?p) { p };
      case (null) { Runtime.trap("No profile found") };
    };
  };

  // Market data functions
  public query ({ caller }) func getMarketData(symbol : Text) : async [MarketData] {
    switch (marketDataRecords.get(symbol)) {
      case (?data) { data };
      case (null) { Array.empty<MarketData>() };
    };
  };

  public shared ({ caller }) func addMarketData(data : MarketData) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admins only");
    };
    let existingData = switch (marketDataRecords.get(data.symbol)) {
      case (?d) { d };
      case (null) { Array.empty<MarketData>() };
    };
    let newData = existingData.concat([data]);
    marketDataRecords.add(data.symbol, newData);
  };

  // AI signals functions
  public query ({ caller }) func getAiSignal(symbol : Text) : async AiSignal {
    switch (aiSignals.get(symbol)) {
      case (?s) { s };
      case (null) { Runtime.trap("No signal for symbol") };
    };
  };

  public shared ({ caller }) func generateAiSignal(symbol : Text, signal : { #buy; #sell; #hold }, confidence : Float) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admins only");
    };
    let newSignal : AiSignal = {
      symbol;
      signal;
      confidence;
      generatedAt = Time.now();
    };
    aiSignals.add(symbol, newSignal);
  };

  // Dashboard stats function
  public query ({ caller }) func getDashboardStats(user : Principal) : async {
    balance : Float;
    openEquity : Float;
    totalTrades : Nat;
    winRate : Float;
  } {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own dashboard stats");
    };
    let profile = switch (userProfiles.get(user)) {
      case (?p) { p };
      case (null) { Runtime.trap("User profile does not exist.") };
    };
    let balance = profile.balance;
    let openEquity = profile.openPositions.foldLeft(0.0, func(acc, p) { acc + (p.entryPrice * p.quantity) });
    let totalTrades = profile.tradeHistory.size();
    let winRate = if (totalTrades == 0) { 0.0 } else {
      let winsArray = profile.tradeHistory.filter(func(p) {
        switch (p.profitLoss) {
          case (?pl) { pl > 0.0 };
          case (null) { false };
        };
      });
      let wins = winsArray.size();
      wins.toFloat() / totalTrades.toFloat() * 100.0;
    };
    {
      balance;
      openEquity;
      totalTrades;
      winRate;
    };
  };

  // Verify admin pin function
  public shared ({ caller }) func verifyAdminPin(pin : Text) : async Bool {
    pin == "997117";
  };

  // Admin stats function
  public shared ({ caller }) func getAdminStats() : async AdminStats {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    // Calculate total users
    let totalUsers = userProfiles.size();

    // Calculate total trades
    var totalTrades = 0;
    var totalWins : Nat = 0;

    userProfiles.values().forEach(
      func(profile) {
        totalTrades += profile.tradeHistory.size();
        totalWins += profile.tradeHistory.filter(func(p) {
          switch (p.profitLoss) {
            case (?pl) { pl > 0.0 };
            case (null) { false };
          };
        }).size();
      }
    );

    // Set premium and free users to 0 for now
    let premiumUsers = 0;
    let freeUsers = 0;

    // Calculate platform-wide win rate
    let platformWinRate = if (totalTrades == 0) {
      0.0;
    } else {
      totalWins.toFloat() / totalTrades.toFloat() * 100.0;
    };

    // Find the most traded symbol
    let symbolCounts = Map.empty<Text, Nat>();

    userProfiles.values().forEach(
      func(profile) {
        profile.tradeHistory.forEach(
          func(trade) {
            let currentCount = switch (symbolCounts.get(trade.symbol)) {
              case (?count) { count };
              case (null) { 0 };
            };
            symbolCounts.add(trade.symbol, currentCount + 1);
          }
        );
      }
    );

    let mostTradedSymbol = switch (symbolCounts.toArray()) {
      case (counts) {
        let (maxSymbol, _) = counts.foldLeft(("", 0), func(acc, current) {
          let (_, accCount) = acc;
          let (_, currentCount) = current;
          if (currentCount > accCount) { current } else { acc };
        });
        maxSymbol;
      };
    };

    {
      totalUsers;
      totalTrades;
      premiumUsers;
      freeUsers;
      platformWinRate;
      mostTradedSymbol;
    };
  };

  // Initialization
  system func postupgrade() {
    // Populate initial market data
    for (data in initialMarketData.values()) {
      marketDataRecords.add(data.symbol, [data]);
    };
  };
};
