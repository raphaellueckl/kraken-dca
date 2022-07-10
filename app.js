#!/usr/bin/env node
/**
 * Kraken DCA
 * by @codepleb
 *
 * Donations in BTC: bc1qut5yvlmr228ct3978ks4y3ar0xhr4vz8j946gv
 * Donations in Lightning-BTC (Telegram): codepleb@ln.tips
 */

const main = async () => {
  const KRAKEN_MIN_BTC_ORDER_SIZE = 0.0001; // Don't change this except if Kraken would change policy! Kraken currently has a minimum order size of 0.0001 BTC.
  const KRAKEN_API_PUBLIC_KEY = process.env.KRAKEN_API_PUBLIC_KEY; // Kraken API public key
  const KRAKEN_API_PRIVATE_KEY = process.env.KRAKEN_API_PRIVATE_KEY; // Kraken API private key
  const CURRENCY = process.env.CURRENCY || "USD"; // Choose the currency that you are depositing regularly. Check here how you currency has to be named: https://docs.kraken.com/rest/#operation/getAccountBalance
  const DATE_OF_CASH_REFILL = Number(process.env.DATE_OF_CASH_REFILL) || 26; // (Number 1-27 only!) Day of month, where new funds get deposited regularly (ignore weekends, that will be handled automatically)
  const KRAKEN_WITHDRAWAL_ADDRESS_KEY =
    process.env.KRAKEN_WITHDRAWAL_ADDRESS_KEY || false; // OPTIONAL! The "Description" (name) of the whitelisted bitcoin address on kraken. Don't set this option if you don't want automatic withdrawals.
  const WITHDRAW_TARGET = process.env.WITHDRAW_TARGET || false; // OPTIONAL! If you set the withdrawal key option but you don't want to withdraw once a month, but rather when reaching a certain amount of accumulated bitcoin, use this variable to override the "withdraw on date" functionality.

  const crypto = require("crypto");
  const https = require("https");

  const { log } = console;
  let logQueue = [];

  const isWeekend = (date) => date.getDay() % 6 == 0;

  const publicApiPath = "/0/public/";
  const privateApiPath = "/0/private/";

  const cashRefillDateValidityCheck = Number(DATE_OF_CASH_REFILL);
  if (
    !Number.isInteger(cashRefillDateValidityCheck) ||
    cashRefillDateValidityCheck < 1 ||
    cashRefillDateValidityCheck > 27
  )
    throw new Error(
      "DATE_OF_CASH_REFILL must be an integer number from and including 1-27! Higher days are not allowed due to technical reasons. If you want to deposit after the 27th anyways, still set DATE_OF_CASH_REFILL to 27 and NOT to 1, as that would convert all your FIAT into BTC by the first of next month!"
    );

  let cryptoPrefix = "";
  let fiatPrefix = "";
  if (CURRENCY === "USD" || CURRENCY === "EUR" || CURRENCY === "GBP") {
    cryptoPrefix = "X";
    fiatPrefix = "Z";
  }

  const executeGetRequest = async (options) => {
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
      path: `${publicApiPath}${endPointName}?${inputParameters || ""}`,
      method: "GET",
    };

    let data = "{}";
    try {
      data = await executeGetRequest(options);
    } catch (e) {
      console.error(`Could not make GET request to ${endPointName}`);
    }
    return JSON.parse(data);
  };

  const executePostRequest = async (
    apiPostBodyData,
    privateApiPath,
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
        path: `${privateApiPath}${endpoint}`,
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
      privateApiPath,
      endpoint,
      nonce,
      apiPostBodyData
    );

    let result = "{}";
    try {
      result = await executePostRequest(
        apiPostBodyData,
        privateApiPath,
        endpoint,
        KRAKEN_API_PUBLIC_KEY,
        signature,
        https
      );
    } catch (e) {
      console.error(`Could not make POST request to ${endpoint}`);
    }

    return JSON.parse(result);
  };

  function createAuthenticationSignature(
    apiPrivateKey,
    apiPath,
    endPointName,
    nonce,
    apiPostBodyData
  ) {
    const apiPost = nonce + apiPostBodyData;
    const secret = Buffer.from(apiPrivateKey, "base64");
    const sha256 = crypto.createHash("sha256");
    const hash256 = sha256.update(apiPost).digest("binary");
    const hmac512 = crypto.createHmac("sha512", secret);
    const signatureString = hmac512
      .update(apiPath + endPointName + hash256, "binary")
      .digest("base64");
    return signatureString;
  }

  const executeBuyOrder = async () => {
    let privateEndpoint = "AddOrder";
    let privateInputParameters = `pair=xbt${CURRENCY.toLowerCase()}&type=buy&ordertype=market&volume=${KRAKEN_MIN_BTC_ORDER_SIZE}`;
    let privateResponse = "";
    privateResponse = await queryPrivateApi(
      privateEndpoint,
      privateInputParameters
    );
    return privateResponse;
  };

  const executeWithdrawal = async (amount) => {
    let privateEndpoint = "Withdraw";
    let privateInputParameters = `asset=XBT&key=${KRAKEN_WITHDRAWAL_ADDRESS_KEY}&amount=${amount}`;
    let privateResponse = "";
    privateResponse = await queryPrivateApi(
      privateEndpoint,
      privateInputParameters
    );
    return privateResponse;
  };

  const formatTimeToHoursAndLess = (timeInMillis) => {
    const hours = timeInMillis / 1000 / 60 / 60;
    const minutes = (timeInMillis / 1000 / 60) % 60;
    const seconds = (timeInMillis / 1000) % 60;
    return `${parseInt(hours, 10)}h ${parseInt(minutes, 10)}m ${Math.round(
      seconds
    )}s`;
  };

  const flushLogging = () => {
    log(logQueue.join(" | "));
    logQueue = [];
  };

  const timer = (delay) =>
    new Promise((resolve) => {
      setTimeout(resolve, delay);
    });

  let interrupted = 0;
  let noSuccessfulCallsYet = true;

  let withdrawalDate = new Date();
  withdrawalDate.setDate(1);
  withdrawalDate.setMonth(withdrawalDate.getMonth() + 1);

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
      Number(WITHDRAW_TARGET) <= btcAmount);

  try {
    log("|===========================================================|");
    log("|                     ------------------                    |");
    log("|                     |   Kraken DCA   |                    |");
    log("|                     ------------------                    |");
    log("|                        by @codepleb                       |");
    log("|                                                           |");
    log("| Donations BTC: bc1qut5yvlmr228ct3978ks4y3ar0xhr4vz8j946gv |");
    log("| Donations Lightning-BTC (Telegram): codepleb@ln.tips      |");
    log("|===========================================================|");
    log();
    log("DCA activated now!");

    while (true) {
      log("--------------------");
      logQueue.push(new Date().toLocaleString());

      if (interrupted) {
        console.error("WARN: Previous API call failed! Retrying...");
      }

      let btcFiatPrice = (
        await queryPublicApi(
          "Ticker",
          `pair=${cryptoPrefix}XBT${fiatPrefix}${CURRENCY}`
        )
      )?.result?.[`${cryptoPrefix}XBT${fiatPrefix}${CURRENCY}`]?.p?.[0];

      if (!btcFiatPrice) {
        flushLogging();
        console.error(
          "Probably invalid currency symbol! If this happens at the start when you run the script first, please fix it. If you see this message after a lot of time, it might just be a failed request that will repair itself automatically."
        );
        if (++interrupted >= 3 && noSuccessfulCallsYet) {
          throw Error("Interrupted! Too many failed API calls.");
        }
        await timer(15000);
        continue;
      }
      logQueue.push(
        `BTC-Price: ${Number(btcFiatPrice).toFixed(0)} ${CURRENCY}`
      );

      let privateEndpoint = "Balance";
      let privateInputParameters = "";

      const balance = (
        await queryPrivateApi(privateEndpoint, privateInputParameters)
      )?.result;

      if (!balance || Object.keys(balance).length === 0) {
        flushLogging();
        console.error(
          "Could not query the balance on your account. Either incorrect API key or key-permissions on kraken!"
        );
        if (++interrupted >= 3 && noSuccessfulCallsYet) {
          throw Error("Interrupted! Too many failed API calls.");
        }
        await timer(15000);
        continue;
      }

      let buyOrderResponse;
      try {
        buyOrderResponse = await executeBuyOrder();
        noSuccessfulCallsYet = false;
      } catch (e) {
        console.error("Buy order request failed!");
      }
      if (buyOrderResponse?.error?.length !== 0) {
        console.error("Could not place buy order!");
      } else {
        log(
          `Success! Kraken Response: ${buyOrderResponse?.result?.descr?.order}`
        );
        logQueue.push(
          `Bought ${KRAKEN_MIN_BTC_ORDER_SIZE} ₿ @ ~${(
            btcFiatPrice * KRAKEN_MIN_BTC_ORDER_SIZE
          ).toFixed(2)} ${CURRENCY}`
        );
      }

      const now = new Date();
      const nextFiatDropDate = new Date(
        `${now.getFullYear()}-${now.getMonth() + 1}-${DATE_OF_CASH_REFILL}`
      );
      if (nextFiatDropDate < now) {
        nextFiatDropDate.setDate(1); // Needed because later used 'setMonth' has a weird implementation logic.
        nextFiatDropDate.setMonth(nextFiatDropDate.getMonth() + 1);
        nextFiatDropDate.setDate(DATE_OF_CASH_REFILL);
      }

      if (isWeekend(nextFiatDropDate))
        nextFiatDropDate.setDate(nextFiatDropDate.getDate() + 1);
      // If first time was SA, next day will be SU, so we have to repeat the check.
      if (isWeekend(nextFiatDropDate))
        nextFiatDropDate.setDate(nextFiatDropDate.getDate() + 1);

      // Since we pin-pointed the date of the next FIAT deposit, we add 1 day extra here. This means, if your FIAT is supposed to drop on the 26th (and you can't tell the exact time, we just assume the very beginning of next day at 00:00, for the calculation of the frequency).
      nextFiatDropDate.setDate(nextFiatDropDate.getDate() + 1);

      const millisUntilNextFiatDrop = nextFiatDropDate - now;
      const fiatAmount = balance[fiatPrefix + CURRENCY];
      const btcAmount = balance.XXBT;
      const myFiatValueInBtc = +fiatAmount / +btcFiatPrice;
      const approximatedAmoutOfOrdersUntilFiatRefill =
        myFiatValueInBtc / KRAKEN_MIN_BTC_ORDER_SIZE;
      let timeUntilNextOrderExecuted = 1000 * 60 * 60; // Default: 1h waiting time if out of money

      logQueue.push(
        `Leftover Fiat: ${Number(fiatAmount).toFixed(2)} ${CURRENCY}`
      );

      logQueue.push(
        `Accumulated BTC: ${Number(btcAmount).toFixed(
          String(KRAKEN_MIN_BTC_ORDER_SIZE).split(".")[1].length
        )} ₿`
      );

      if (approximatedAmoutOfOrdersUntilFiatRefill >= 1) {
        timeUntilNextOrderExecuted =
          millisUntilNextFiatDrop / approximatedAmoutOfOrdersUntilFiatRefill;

        logQueue.push(
          `Next buy in ${formatTimeToHoursAndLess(
            timeUntilNextOrderExecuted
          )} on: ${new Date(
            now.getTime() + timeUntilNextOrderExecuted
          ).toLocaleString()}`
        );
      } else {
        logQueue.push(
          `${new Date().toLocaleString()} Out of fiat money! Checking again in one hour...`
        );
      }

      flushLogging();

      if (isWithdrawalDue(btcAmount)) {
        const withdrawal = await executeWithdrawal(btcAmount);
        if (withdrawal?.result?.refid)
          console.log(
            `Withdrawal executed! Date: ${new Date().toLocaleString()}!`
          );
        else console.error(`Withdrawal failed! ${withdrawal?.error}`);
      }
      interrupted = 0;
      await timer(timeUntilNextOrderExecuted);
    }
  } catch (e) {
    log();
    log("AN ERROR OCCURED :(");
    log(e);
  }
};

main();
