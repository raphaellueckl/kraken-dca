#!/usr/bin/env node
import crypto from "crypto";
import https from "https";

/**
 * Kraken DCA Bot
 * by @codepleb
 *
 * Donations in BTC: bc1q4et8wxhsguz8hsm46pnuvq7h68up8mlw6fhqyt
 * Donations in Lightning-BTC (Telegram): codepleb@ln.tips
 */

const KRAKEN_API_PUBLIC_KEY = process.env.KRAKEN_API_PUBLIC_KEY; // Kraken API public key
const KRAKEN_API_PRIVATE_KEY = process.env.KRAKEN_API_PRIVATE_KEY; // Kraken API private key
const CURRENCY = process.env.CURRENCY || "USD"; // Choose the currency that you are depositing regularly. Check here how you currency has to be named: https://docs.kraken.com/rest/#operation/getAccountBalance
const DATE_OF_CASH_REFILL = Number(process.env.DATE_OF_CASH_REFILL); // OPTIONAL! Day of month, where new funds get deposited regularly (ignore weekends, that will be handled automatically)
const KRAKEN_WITHDRAWAL_ADDRESS_KEY =
  process.env.KRAKEN_WITHDRAWAL_ADDRESS_KEY || false; // OPTIONAL! The "Description" (name) of the whitelisted bitcoin address on kraken. Don't set this option if you don't want automatic withdrawals.
const WITHDRAW_TARGET = Number(process.env.WITHDRAW_TARGET) || false; // OPTIONAL! If you set the withdrawal key option but you don't want to withdraw once a month, but rather when reaching a certain amount of accumulated bitcoin, use this variable to override the "withdraw on date" functionality.
const KRAKEN_BTC_ORDER_SIZE =
  Number(process.env.KRAKEN_BTC_ORDER_SIZE) || 0.0001; // OPTIONAL! Changing this value is not recommended. Kraken currently has a minimum order size of 0.0001 BTC. You can adapt it if you prefer fewer buys (for better tax management or other reasons).
const FIAT_CHECK_DELAY = Number(process.env.FIAT_CHECK_DELAY) || 60 * 1000; // OPTIONAL! Custom fiat check delay. This delay should not be smaller than the delay between orders.

const PUBLIC_API_PATH = "/0/public/";
const PRIVATE_API_PATH = "/0/private/";
const { log } = console;

export const getPrefixForCurrency = (currency) => {
  if (currency === "USD" || currency === "EUR" || currency === "GBP") {
    return { cryptoPrefix: "X", fiatPrefix: "Z" };
  }
  return { cryptoPrefix: "", fiatPrefix: "" };
};

export const refreshWithdrawalDate = () => {
  const withdrawalDate = new Date();
  withdrawalDate.setDate(1);
  withdrawalDate.setMonth(withdrawalDate.getMonth() + 1);
  return withdrawalDate;
};

const { cryptoPrefix, fiatPrefix } = getPrefixForCurrency(CURRENCY);

let withdrawalDate = refreshWithdrawalDate();
let lastFiatBalance = Number.NEGATIVE_INFINITY;
let lastBtcFiatPrice = Number.NEGATIVE_INFINITY;
let dateOfEmptyFiat = new Date();
let dateOfNextOrder = new Date();

let logQueue = [`[${new Date().toLocaleString()}]`];
let firstRun = true;
let interrupted = 0;
let noSuccessfulBuyYet = true;

let fiatAmount = undefined;

const isWeekend = (date) => date.getDay() % 6 == 0;

const executeGetRequest = (options) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (d) => {
        data += d;
      });
      res.on("end", () => {
        resolve(data);
      });
    });

    req.on("error", (error) => {
      console.error(error);
      reject(error);
    });
    req.end();
  });
};

const queryPublicApi = async (endPointName, inputParameters) => {
  const options = {
    hostname: "api.kraken.com",
    port: 443,
    path: `${PUBLIC_API_PATH}${endPointName}?${inputParameters || ""}`,
    method: "GET",
  };

  let data = "{}";
  try {
    data = await executeGetRequest(options);
    return JSON.parse(data);
  } catch (e) {
    console.error(`Could not make GET request to ${endPointName}`);
    return JSON.parse("{}");
  }
};

const executePostRequest = (
  apiPostBodyData,
  apiPath,
  endpoint,
  KRAKEN_API_PUBLIC_KEY,
  signature,
  https
) => {
  return new Promise((resolve, reject) => {
    const body = apiPostBodyData;
    const options = {
      hostname: "api.kraken.com",
      port: 443,
      path: `${apiPath}${endpoint}`,
      method: "POST",
      headers: {
        "API-Key": KRAKEN_API_PUBLIC_KEY,
        "API-Sign": signature,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (d) => {
        data += d;
      });

      res.on("end", () => {
        resolve(data);
      });
    });

    req.on("error", (error) => {
      console.error("error happened", error);
      reject(error);
    });

    req.write(body);
    req.end();
  });
};

const queryPrivateApi = async (endpoint, params) => {
  const nonce = Date.now().toString();
  const apiPostBodyData = "nonce=" + nonce + "&" + params;

  const signature = createAuthenticationSignature(
    KRAKEN_API_PRIVATE_KEY,
    PRIVATE_API_PATH,
    endpoint,
    nonce,
    apiPostBodyData
  );

  let result = "{}";
  try {
    result = await executePostRequest(
      apiPostBodyData,
      PRIVATE_API_PATH,
      endpoint,
      KRAKEN_API_PUBLIC_KEY,
      signature,
      https
    );
    return JSON.parse(result);
  } catch (e) {
    console.error(`Could not make successful POST request to ${endpoint}`);
    return JSON.parse("{}");
  }
};

const createAuthenticationSignature = (
  apiPrivateKey,
  apiPath,
  endPointName,
  nonce,
  apiPostBodyData
) => {
  const apiPost = nonce + apiPostBodyData;
  const secret = Buffer.from(apiPrivateKey, "base64");
  const sha256 = crypto.createHash("sha256");
  const hash256 = sha256.update(apiPost).digest("binary");
  const hmac512 = crypto.createHmac("sha512", secret);
  const signatureString = hmac512
    .update(apiPath + endPointName + hash256, "binary")
    .digest("base64");
  return signatureString;
};

const buyBitcoin = async () => {
  let buyOrderResponse;
  try {
    buyOrderResponse = await executeBuyOrder();
    if (buyOrderResponse?.error?.length !== 0) {
      console.error(
        "Buy-Order response had invalid structure! Skipping this buy order."
      );
    } else {
      noSuccessfulBuyYet = false;
      logQueue.push(
        `Kraken: ${buyOrderResponse?.result?.descr?.order} > Success!`
      );
      logQueue.push(
        `Bought for ~${(lastBtcFiatPrice * KRAKEN_BTC_ORDER_SIZE).toFixed(
          2
        )} ${CURRENCY}`
      );
    }
  } catch (e) {
    console.error(
      "Buy order request failed! Probably a temporary issue with Kraken, if you don't see this error right from the start. Skipping this one."
    );
  }
};

const executeBuyOrder = async () => {
  const privateEndpoint = "AddOrder";
  const privateInputParameters = `pair=xbt${CURRENCY.toLowerCase()}&type=buy&ordertype=market&volume=${KRAKEN_BTC_ORDER_SIZE}`;
  let privateResponse = "";
  privateResponse = await queryPrivateApi(
    privateEndpoint,
    privateInputParameters
  );
  return privateResponse;
};

const executeWithdrawal = async (amount) => {
  const privateEndpoint = "Withdraw";
  const privateInputParameters = `asset=XBT&key=${KRAKEN_WITHDRAWAL_ADDRESS_KEY}&amount=${amount}`;
  let privateResponse = "";
  privateResponse = await queryPrivateApi(
    privateEndpoint,
    privateInputParameters
  );
  return privateResponse;
};

const isWithdrawalDateDue = () => {
  if (new Date() > withdrawalDate) {
    withdrawalDate.setDate(1);
    withdrawalDate.setMonth(withdrawalDate.getMonth() + 1);
    return true;
  }
  return false;
};

const isWithdrawalDue = (btcAmount) =>
  (KRAKEN_WITHDRAWAL_ADDRESS_KEY &&
    !WITHDRAW_TARGET &&
    isWithdrawalDateDue()) ||
  (KRAKEN_WITHDRAWAL_ADDRESS_KEY &&
    WITHDRAW_TARGET &&
    WITHDRAW_TARGET <= btcAmount);

const fetchBtcFiatPrice = async () =>
  Number(
    (
      await queryPublicApi(
        "Ticker",
        `pair=${cryptoPrefix}XBT${fiatPrefix}${CURRENCY}`
      )
    )?.result?.[`${cryptoPrefix}XBT${fiatPrefix}${CURRENCY}`]?.p?.[0]
  );

const printInvalidCurrencyError = () => {
  flushLogging();
  console.error(
    "Probably invalid currency symbol! If this happens at bot startup, please fix it. If you see this message after a lot of time, it might just be a failed request that will repair itself automatically."
  );
  if (++interrupted >= 3 && noSuccessfulBuyYet) {
    throw Error("Interrupted! Too many failed API calls.");
  }
};

const printInvalidBtcHoldings = () => {
  flushLogging();
  console.error(
    "Couldn't fetch Bitcoin holdings. This is most probably a temporary issue with kraken, that will fix itself."
  );
};

const printBalanceQueryFailedError = () => {
  flushLogging();
  console.error(
    "Could not query the balance on your account. Either incorrect API key or key-permissions on kraken!"
  );
  if (++interrupted >= 3 && noSuccessfulBuyYet) {
    throw Error("Interrupted! Too many failed API calls.");
  }
};

const withdrawBtc = async (btcAmount) => {
  console.log(`Attempting to withdraw ${btcAmount} ₿ ...`);
  const withdrawal = await executeWithdrawal(btcAmount);
  if (withdrawal?.result?.refid)
    console.log(`Withdrawal executed! Date: ${new Date().toLocaleString()}!`);
  else console.error(`Withdrawal failed! ${withdrawal?.error}`);
};

const estimateNextFiatDepositDate = (firstRun) => {
  dateOfEmptyFiat = new Date();

  // If 'DATE_OF_CASH_REFILL' is not set, ignore.
  if (firstRun && !isNaN(DATE_OF_CASH_REFILL)) {
    dateOfEmptyFiat.setDate(DATE_OF_CASH_REFILL);
    if (dateOfEmptyFiat.getTime() <= Date.now()) {
      dateOfEmptyFiat.setMonth(dateOfEmptyFiat.getMonth() + 1);
    }
  } else {
    dateOfEmptyFiat.setMonth(dateOfEmptyFiat.getMonth() + 1);
  }

  if (isWeekend(dateOfEmptyFiat))
    dateOfEmptyFiat.setDate(dateOfEmptyFiat.getDate() - 1);
  // If first time was SUN, previous day will be SAT, so we have to repeat the check.
  if (isWeekend(dateOfEmptyFiat))
    dateOfEmptyFiat.setDate(dateOfEmptyFiat.getDate() - 1);
};

const evaluateMillisUntilNextOrder = () => {
  if (lastBtcFiatPrice > 0) {
    const myFiatValueInBtc = fiatAmount / lastBtcFiatPrice;
    const approximatedAmoutOfOrdersUntilFiatRefill =
      myFiatValueInBtc / KRAKEN_BTC_ORDER_SIZE;

    if (approximatedAmoutOfOrdersUntilFiatRefill < 1) {
      console.error(
        `Cannot estimate time for next order. Fiat: ${fiatAmount}, Last BTC price: ${lastBtcFiatPrice}`
      );
    } else {
      const now = Date.now();
      dateOfNextOrder = new Date(
        (dateOfEmptyFiat.getTime() - now) /
          approximatedAmoutOfOrdersUntilFiatRefill +
          now
      );
    }
  } else {
    console.error("Last BTC fiat price was not present!");
  }
};

const formatTimeToHoursAndLess = (timeInMillis) => {
  const hours = timeInMillis / 1000 / 60 / 60;
  const minutes = (timeInMillis / 1000 / 60) % 60;
  const seconds = (timeInMillis / 1000) % 60;
  return `${parseInt(hours, 10)}h ${parseInt(minutes, 10)}m ${Math.round(
    seconds
  )}s`;
};

const flushLogging = (printLogs) => {
  if (printLogs) log(logQueue.join(" > "));
  logQueue = [`[${new Date().toLocaleString()}]`];
};

const timer = (delay) =>
  new Promise((resolve) => {
    setTimeout(resolve, delay);
  });

const main = async () => {
  log();
  log("|===========================================================|");
  log("|                     ------------------                    |");
  log("|                     |   Kraken DCA   |                    |");
  log("|                     ------------------                    |");
  log("|                        by @codepleb                       |");
  log("|                                                           |");
  log("| Donations BTC: bc1q4et8wxhsguz8hsm46pnuvq7h68up8mlw6fhqyt |");
  log("| Donations Lightning-BTC (Telegram): codepleb@ln.tips      |");
  log("|===========================================================|");
  log();
  log("DCA activated now!");
  log("Fiat currency to be used:", CURRENCY);

  const runner = async () => {
    while (true) {
      try {
        let buyOrderExecuted = false;
        const balance = (await queryPrivateApi("Balance", ""))?.result;
        fiatAmount = Number(
          balance?.[CURRENCY === "AUD" ? "Z" : fiatPrefix + CURRENCY]
        );
        if (
          !balance ||
          Object.keys(balance).length === 0 ||
          (fiatAmount !== 0 && !fiatAmount)
        ) {
          printBalanceQueryFailedError();
          await timer(FIAT_CHECK_DELAY);
          continue;
        }

        logQueue.push(`Fiat: ${Number(fiatAmount).toFixed(2)} ${CURRENCY}`);
        const newFiatArrived = fiatAmount > lastFiatBalance;
        if (newFiatArrived || firstRun) {
          estimateNextFiatDepositDate(firstRun);
          lastFiatBalance = fiatAmount;
          firstRun = false;
          logQueue.push(
            `Empty fiat @ approx. ${dateOfEmptyFiat.toLocaleString()}`
          );
        }

        lastBtcFiatPrice = await fetchBtcFiatPrice();
        if (!lastBtcFiatPrice) {
          printInvalidCurrencyError();
          await timer(FIAT_CHECK_DELAY);
          continue;
        }
        logQueue.push(`BTC Price: ${lastBtcFiatPrice.toFixed(2)} ${CURRENCY}`);

        const btcAmount = Number(balance?.XXBT);
        if (!btcAmount && btcAmount !== 0) {
          printInvalidBtcHoldings();
          await timer(FIAT_CHECK_DELAY);
          continue;
        }
        const now = Date.now();
        // ---|--o|---|---|---|---|-o-|---
        //  x  ===  x   x   x   x  ===  x
        if (dateOfNextOrder < now || newFiatArrived) {
          await buyBitcoin(logQueue);
          evaluateMillisUntilNextOrder();
          buyOrderExecuted = true;
        }

        const newBtcAmount = btcAmount + KRAKEN_BTC_ORDER_SIZE;
        logQueue.push(
          `Accumulated BTC: ${newBtcAmount.toFixed(
            String(KRAKEN_BTC_ORDER_SIZE).split(".")[1].length
          )} ₿`
        );

        logQueue.push(
          `Next order in: ${formatTimeToHoursAndLess(
            dateOfNextOrder.getTime() - Date.now()
          )} @ ${dateOfNextOrder.toLocaleString().split(", ")[1]}`
        );

        flushLogging(buyOrderExecuted);

        if (buyOrderExecuted && isWithdrawalDue(newBtcAmount)) {
          await withdrawBtc(newBtcAmount);
        }

        await timer(FIAT_CHECK_DELAY);
      } catch (e) {
        console.error("General Error. :/", e);
        await timer(FIAT_CHECK_DELAY);
      }
    }
  };

  try {
    await runner();
  } catch (e) {
    flushLogging();
    console.error("Unhandled error happened. :(");
    throw e;
  }
};

main();
