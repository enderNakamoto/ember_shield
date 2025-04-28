export const allMarkets = [
  {
    ControllerAddress: "0x2Ed1BD05E207BfB88CbCCC9cc4649d259CB17eA7",
    FactoryAddress: "0xE20AF7351322853B493a564c8D4E6d6c9cbFF0F6",
    HedgeAddress: "0xc7468d4fD8Eb69eA36D72bBb3571108E0AdA4fcD",
    RiskAddress: "0x17A16A8D28b5A5C4937E3986A66862E8d5325f65",
    MarketId: 3,
    HedgeEvent: "Fire will be detected in San Francisco area before maturity",
    RiskEvent: "Fire will NOT be detected in San Francisco area before maturity",
    HedgePayment: "25%",
    RiskPayment: "40%",
    MaturityDate: "May 27 2025 19:14:59 GMT+0",
    StrikePrice: 0,
    Fee: 0,
  }
];

export const oracle = "Flare FDC Network";

export const baseEventDescriptionHedge =
  "Fire will be detected in the specified area before maturity";

export const baseEventDescriptionRisk =
  "Fire will NOT be detected in the specified area before maturity";
