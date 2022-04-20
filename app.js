#!/usr/bin/env node
/**
 * Kraken DCA
 * by @codepleb
 *
 * Donations in BTC:
 * Donations in Lightning BTC:
 *
 * This app allows to you to DCA into Bitcoin on Kraken. It checks the Balance on your Kraken Account and runs as many BTC buy orders as possible and tries to split it equally over time.
 *
 * Preconditions:
 * - This script assumes, that you deposit FIAT once a month.
 * - This script assumes, that on Saturday and Sunday, no fiat deposits are possible by your bank (not a big deal if that's not the case, it won't break anything).
 *
 * Steps involved:
 * - Create an API key in your Kraken account with ONLY the options "Query Funds" and "Create & Modify Orders". Selecting other choices will be a huge risk to all of your funds and does not provide any advantage!
 * - Start the script by opening a terminal and entereing the following into a terminal (do not write the '<>' characters):
 *   Schema: KRAKEN_API_PUBLIC_KEY=<your public key> KRAKEN_API_PRIVATE_KEY=<your private key> CURRENCY=<your currency, e.g. USD / EUR / CHF> SHOW_BTC_VALUE=<true / false> node app.js
 *   Example script start: KRAKEN_API_PUBLIC_KEY=8b9j4hD7mhPVDAoDZrZ8BPsJWoBCQ0XmBMPPb4LPBDpMjpXPgD4sc+Ps KRAKEN_API_PRIVATE_KEY=Xbg0kGG1qtvCnuFu9pLSk8pnWq8xSXVo/qg9p58CVqSSWYQ=uv1gUJ7eYpf9Fp4rnpBggpm4n597FjHuHvHgSo== CURRENCY=CHF SHOW_BTC_VALUE=true node app.js
 * - Leave the script running for as long as you want to keep buying as often as possible. :) A buy order will instantly trigger as soon as you start the script (if you have some money left on the exchange).
 */

const main = async () => {
  const DATE_OF_CASH_REFILL = Number(process.env.DATE_OF_CASH_REFILL) || 26; // Day of month, where new funds get deposited regularly (ignore weekends, that will be handled automatically)
  const CURRENCY = process.env.CURRENCY || "USD"; // Choose the currency that you are depositing regularly. Check here how you currency has to be named: https://docs.kraken.com/rest/#operation/getAccountBalance
  const KRAKEN_MIN_BTC_ORDER_SIZE = 0.0001; // Kraken currently has a minimum order size of 0.0001 BTC. Can be changed, but should be the standard for the next few years I think.

  const KRAKEN_API_PUBLIC_KEY = process.env.KRAKEN_API_PUBLIC_KEY; // Kraken API public key
  const KRAKEN_API_PRIVATE_KEY = process.env.KRAKEN_API_PRIVATE_KEY; // Kraken API private key
  const KRAKEN_WITHDRAWAL_ADDRESS_KEY =
    process.env.KRAKEN_WITHDRAWAL_ADDRESS_KEY || false; // OPTIONAL! The "Description" (name) of the whitelisted bitcoin address on kraken. Don't set this option if you don't want automatic withdrawals.
  const SHOW_BTC_VALUE = process.env.SHOW_BTC_VALUE || false; // OPTIONAL! Print amount of BTC to the console after each buy order
  const crypto = require("crypto");
  const https = require("https");

  const { log, error } = console;
  let logQueue = [];

  const isWeekend = (date) => date.getDay() % 6 == 0;

  const publicApiPath = "/0/public/";
  const privateApiPath = "/0/private/";

  let cryptoPrefix = "";
  let fiatPrefix = "";
  if (CURRENCY === "USD" || CURRENCY === "EUR") {
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
        error(error);
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
      error(`Could not make GET request to ${endPointName}`);
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
        error("error happened", error);
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
      error(`Could not make POST request to ${endpoint}`);
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

  let interrupted = false;

  let withdrawalDate = new Date();
  withdrawalDate.setDate(1);
  withdrawalDate.setMonth(withdrawalDate.getMonth() + 1);

  const isWithdrawalDue = () => {
    if (new Date() > withdrawalDate) {
      withdrawalDate.setDate(1);
      withdrawalDate.setMonth(withdrawalDate.getMonth() + 1);
      return true;
    }
    return false;
  };

  try {
    log("|===========================================================|");
    log("|                     ------------------                    |");
    log("|                     |   Kraken DCA   |                    |");
    log("|                     ------------------                    |");
    log("|                        by @codepleb                       |");
    log("|                                                           |");
    log("| Donations BTC: bc1qut5yvlmr228ct3978ks4y3ar0xhr4vz8j946gv |");
    log("|===========================================================|");
    log();
    log("DCA activated now!");

    while (true) {
      log("--------------------");
      let buyOrderResponse;
      if (!interrupted) {
        try {
          buyOrderResponse = await executeBuyOrder();
        } catch (e) {
          error("Buy order https-request failed!");
        }
        if (buyOrderResponse?.error?.length !== 0) {
          error("Could not place buy order!");
        } else {
          logQueue.push(`Success! ${buyOrderResponse?.result?.descr?.order}`);
        }
      } else {
        interrupted = false;
      }

      let btcFiatPrice = (
        await queryPublicApi(
          "Ticker",
          `pair=${cryptoPrefix}XBT${fiatPrefix}${CURRENCY}`
        )
      )?.result?.[`${cryptoPrefix}XBT${fiatPrefix}${CURRENCY}`]?.p?.[0];

      if (!btcFiatPrice) {
        flushLogging();
        error(
          "Probably invalid currency symbol! If this happens at the start when you run the script first, please fix it. If you see this message after a lot of time, it might just be a failed request that will repair itself automatically."
        );
        interrupted = true;
        continue;
      }
      logQueue.push(`BTC-Price: ${btcFiatPrice} ${CURRENCY}`);

      let privateEndpoint = "Balance";
      let privateInputParameters = "";

      const balance = (
        await queryPrivateApi(privateEndpoint, privateInputParameters)
      )?.result;

      if (!balance || Object.keys(balance).length === 0) {
        flushLogging();
        error(
          "Could not query the balance on your account. Either fix your API Key on kraken or if you're lucky, this is temporary and will fix itself!"
        );
        interrupted = true;
        continue;
      }

      const now = new Date();
      const nextFiatDropDate = new Date(
        `${now.getFullYear()}-${now.getMonth() + 1}-${DATE_OF_CASH_REFILL}`
      );
      if (nextFiatDropDate < now) {
        nextFiatDropDate.setDate(1); //Needed because later used 'setMonth' has a weird implementation logic.
        nextFiatDropDate.setMonth(nextFiatDropDate.getMonth() + 1);
        nextFiatDropDate.setDate(DATE_OF_CASH_REFILL + 1); // We add 1 to make sure we don't run out of fiat in the end. This will set the date right to the start of the next day.
      }

      if (isWeekend(nextFiatDropDate))
        nextFiatDropDate.setDate(nextFiatDropDate.getDate() + 1);
      // If first time was SA, next day will be SU, so we have to repeat the check.
      if (isWeekend(nextFiatDropDate))
        nextFiatDropDate.setDate(nextFiatDropDate.getDate() + 1);

      const millisUntilNextFiatDrop = nextFiatDropDate - now;
      const fiatAmount = balance[fiatPrefix + CURRENCY];
      const btcAmount = balance.XXBT;
      const myFiatValueInBtc = +fiatAmount / +btcFiatPrice;
      const approximatedAmoutOfOrdersUntilFiatRefill =
        myFiatValueInBtc / KRAKEN_MIN_BTC_ORDER_SIZE;
      let timeUntilNextOrderExecuted = 1000 * 60 * 60; // Default: 1h waiting time if out of money

      logQueue.push(`Leftover Fiat: ${fiatAmount} ${CURRENCY}`);
      if (SHOW_BTC_VALUE) logQueue.push(`Accumulated Bitcoin: ${btcAmount} ₿`);

      if (approximatedAmoutOfOrdersUntilFiatRefill >= 1) {
        timeUntilNextOrderExecuted =
          millisUntilNextFiatDrop / approximatedAmoutOfOrdersUntilFiatRefill;

        logQueue.push(
          `Next Buy Order: ${new Date(
            now.getTime() + timeUntilNextOrderExecuted
          )}`
        );
        logQueue.push(
          `Current time between each buy order: ${formatTimeToHoursAndLess(
            timeUntilNextOrderExecuted
          )}`
        );
      } else {
        logQueue.push(
          `${new Date().toLocaleString()} Out of fiat money! Checking again in one hour...`
        );
      }

      flushLogging();

      // withdrawalDate.setMonth(withdrawalDate.getMonth() - 1);
      if (KRAKEN_WITHDRAWAL_ADDRESS_KEY && isWithdrawalDue()) {
        const withdrawal = await executeWithdrawal(btcAmount);
        // const withdrawal = await executeWithdrawal(0.0005);
        if (withdrawal?.result?.refid)
          console.log(
            `Withdrawal executed! Date: ${new Date().toLocaleString()}!`
          );
        else console.error(`Withdrawal failed! ${withdrawal?.error}`);
      }
      await timer(timeUntilNextOrderExecuted);
    }

    // log("|=======================================|");
    // log("|             DCA stopped!              |");
    // log("|=======================================|");
  } catch (e) {
    log();
    log("AN EXCEPTION OCCURED :(");
    log(e);
  }
};

main();
