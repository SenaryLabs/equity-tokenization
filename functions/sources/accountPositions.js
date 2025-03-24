//const issuerAccountId = args[0]; // Issuer Alpaca Account ID
const symbol = args[0]; // e.g., "NVDA"

// Check API Keys are available
if (!secrets.alpacaKey || !secrets.alpacaSecret) {
  throw Error("Missing Alpaca API keys");
}

const response = await Functions.makeHttpRequest({
  url: `https://paper-api.alpaca.markets/v2/positions/${symbol}`,
  headers: {
    "APCA-API-KEY-ID": secrets.alpacaKey,
    "APCA-API-SECRET-KEY": secrets.alpacaSecret,
    Accept: "application/json",
  },
});

// Handle cases where the position doesn't exist or API call fails
if (response.status === 404) {
  throw Error(`No holdings found for ${symbol}`);
}

if (response.status !== 200) {
  throw Error(`API call failed with status: ${response.status}`);
}

// Extract available quantity from Alpaca response
const position = parseFloat(response.data.qty_available || "0");

// Success: return issuer’s available holdings (as uint256)
return Functions.encodeUint256(Math.floor(position * 1e6)); // scaled to handle decimals if needed
