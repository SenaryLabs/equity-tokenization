let ethers;

const SLEEP_TIME = 2000; // 2 seconds
const side = "buy";

const symbolDecimals = {
  ETH: 18, // Ether
  BTCUSD: 18, // Example: Bitcoin price often uses 8 decimals
  USDC: 6, // USDC typically uses 6 decimals
  USDT: 6, // Tether also uses 6 decimals
  DAI: 18, // DAI uses 18 decimals
};

/**
 * Formats a quantity based on the given symbol's decimal precision.
 *
 * @param {string} symbol - The symbol of the asset (e.g., ETH, BTCUSD, USDC).
 * @param {string | BigNumber} qty - The quantity to format.
 * @returns {string} - The formatted quantity or raw quantity if symbol is not found.
 */
function decimalPrecision(symbol, qty) {
  const decimals = symbolDecimals[symbol];
  if (decimals === undefined) {
    console.warn(
      `Symbol "${symbol}" not found in mapping. Returning raw quantity.`
    );
    return qty.toString(); // Return the raw quantity
  }
  return ethers.formatUnits(qty, decimals);
}

async function main() {
  ethers = await import("npm:ethers@6.10.0");

  const symbol = args[0];
  const qty = decimalPrecision(symbol, args[1]); // Convert to 18 decimals
  const client_order_id = args[2];

  console.log(`Buying ${qty} ${symbol}...`);

  _checkKeys();

  const alpacaBuyRequest = Functions.makeHttpRequest({
    method: "POST",
    url: "https://paper-api.alpaca.markets/v2/orders",
    headers: {
      accept: "application/json",
      content_type: "application/json",
      "APCA-API-KEY-ID": secrets.alpacaKey,
      "APCA-API-SECRET-KEY": secrets.alpacaSecret,
    },
    data: {
      side: side,
      type: "market",
      time_in_force: "gtc",
      symbol: symbol,
      qty: qty,
      client_order_id: client_order_id,
    },
  });

  await Promise.all([alpacaBuyRequest]);

  // Wait for the order to fill
  const response_data = await waitForOrderToFill(client_order_id);

  console.log(`Order filled:`, response_data);

  //return Functions.encodeUint256(0);
  return Functions.encodeUint256(
    ethers.parseUnits(response_data.filled_avg_price, 6)
  );
}

async function waitForOrderToFill(
  clientOrderId,
  maxAttempts = 10,
  sleepTime = 1000
) {
  const alpacaBaseUrl = `https://paper-api.alpaca.markets/v2/orders:by_client_order_id`;

  try {
    console.log(
      `Waiting for order with client_order_id "${clientOrderId}" to fill...`
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Attempt ${attempt} of ${maxAttempts}...`);

      // Make the HTTP request using Chainlink Functions
      const response = await Functions.makeHttpRequest({
        method: "GET",
        url: alpacaBaseUrl,
        headers: {
          "APCA-API-KEY-ID": secrets.alpacaKey,
          "APCA-API-SECRET-KEY": secrets.alpacaSecret,
          accept: "application/json",
        },
        params: {
          client_order_id: clientOrderId,
        },
      });

      // Check if the order exists and is filled
      if (response.status === 200 && response.data) {
        const orderData = response.data;
        console.log(`Order status: ${orderData.status}`);

        if (orderData.status === "filled") {
          //console.log("Order is filled.", orderData);
          return orderData; // Return the filled order data
        }
      } else if (response.status === 404) {
        console.log("Order not found. Retrying...");
      } else {
        console.error(
          `Unexpected response: ${response.status} ${response.statusText}`
        );
      }

      // Sleep before the next attempt
      await sleep(sleepTime);
    }

    console.log(
      `Order with client_order_id "${clientOrderId}" did not fill within ${maxAttempts} attempts.`
    );
    return null; // Return null if the order is not filled
  } catch (error) {
    console.error("Error while waiting for order to fill:", error.message);
    return null; // Return null in case of any errors
  }
}

function _checkKeys() {
  if (secrets.alpacaKey == "" || secrets.alpacaSecret === "") {
    throw Error("need alpaca keys");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const result = await main();
return result;
