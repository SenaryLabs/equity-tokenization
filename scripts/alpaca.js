const axios = require("axios");
require("dotenv").config();

const ALPACA_API_KEY = process.env.ALPACA_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET;

if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
  throw new Error("Missing Alpaca API credentials in environment variables.");
}

/**
 * Fetches the best bid and ask prices for a given **stock symbol**.
 *
 * @param {string} symbol - Stock symbol (e.g., "AAPL", "TSLA").
 * @returns {Promise<{ bid: number, ask: number } | null>} - Best bid/ask prices or null if unavailable.
 */
async function getStockBidAsk(symbol) {
  const url = `https://data.alpaca.markets/v2/stocks/quotes/latest`;

  try {
    const response = await axios.get(url, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
        Accept: "application/json",
      },
      params: { symbols: symbol },
    });

    const quote = response.data.quotes[symbol];
    if (!quote) {
      console.error(`No stock data found for ${symbol}`);
      return null;
    }

    return { bid: quote.bp, ask: quote.ap }; // Best bid & ask
  } catch (error) {
    console.error("Error fetching stock bid/ask:", error.message);
    return null;
  }
}

/**
 * Fetches the best bid and ask prices for a given **crypto symbol**.
 *
 * @param {string} symbol - Crypto pair (e.g., "BTC/USD", "ETH/USD").
 * @returns {Promise<{ bid: number, ask: number } | null>} - Best bid/ask prices or null if unavailable.
 */
async function getCryptoBidAsk(symbol) {
  const url = `https://data.alpaca.markets/v1beta3/crypto/us/latest/orderbooks?symbols=${symbol}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
        Accept: "application/json",
      },
    });

    const orderBook = response.data.orderbooks[symbol];
    if (!orderBook) {
      console.error(`No crypto order book found for ${symbol}`);
      return null;
    }

    const bestBid = orderBook.b[0]?.p ?? null; // Highest bid
    const bestAsk = orderBook.a[0]?.p ?? null; // Lowest ask

    return { bid: bestBid, ask: bestAsk };
  } catch (error) {
    console.error("Error fetching crypto bid/ask:", error.message);
    return null;
  }
}

/**
 * Fetches available assets from Alpaca.
 *
 * @returns {Promise<Object[]>} - A list of available assets.
 */
async function getAlpacaAssets() {
  const url = "https://paper-api.alpaca.markets/v2/assets";

  try {
    const response = await axios.get(url, {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
        Accept: "application/json",
      },
    });

    if (response.status !== 200) {
      throw new Error(`Unexpected response from Alpaca: ${response.status}`);
    }

    return response.data; // Return asset list
  } catch (error) {
    console.error("Error fetching Alpaca assets:", error.message);
    return null;
  }
}

function symbolToPair(symbol) {
  const cryptoPairs = ["BTCUSD", "ETHUSD", "ETHBTC", "SOLUSD", "ADAUSD"]; // Add more as needed

  if (cryptoPairs.includes(symbol.toUpperCase())) {
    return symbol.slice(0, -3) + "/" + symbol.slice(-3); // Converts "BTCUSD" → "BTC/USD"
  }

  // If it's not a known crypto pair, return as-is (assumed to be a stock symbol)
  return symbol.toUpperCase(); // Stock symbols remain unchanged
}

module.exports = {
  getStockBidAsk,
  getCryptoBidAsk,
  getAlpacaAssets,
  symbolToPair,
};
