import React, { createContext, useContext } from 'react';

type MarketContextValue = {
  marketCode: string;
};

const defaultValue: MarketContextValue = { marketCode: 'SE' };

const MarketContext = createContext<MarketContextValue>(defaultValue);

export const MarketProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <MarketContext.Provider value={defaultValue}>{children}</MarketContext.Provider>;
};

export const useMarket = () => useContext(MarketContext);

export default MarketContext;
