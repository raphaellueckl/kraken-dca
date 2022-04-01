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
 * - This script assumes, that on SA and SU, no fiat deposits are possible by your bank (not a big deal if that's not the case).
 *
 * Steps involved:
 * - Create an API key in your Kraken account with ONLY the options "Query Funds" and "Create & Modify Orders". Selecting other choices will be a huge risk to all of your funds and does not provide any advantage!
 * - Fill the "User defined" section
 * - Start the script by opening a terminal and entereing "node app.js" from the same folder.
 * - Leave the script running for as long as you want to keep buying as often as possible. :)
 */

// User defined
const DATE_OF_CASH_REFILL = 26; // Day of month, where new funds get deposited regularly (ignore weekends, that will be handled automatically)
const CURRENCY = "CHF"; // Swiss Francs for me. Choose the currency that you are depositing regularly. Check here how you currency has to be named: https://docs.kraken.com/rest/#operation/getAccountBalance
const KRAKEN_MIN_BTC_ORDER_SIZE = 0.0001; // Kraken currently has a minimum order size of 0.0001 BTC. Can be changed, but should be the standard for the next few years I think.

// 🛑 🛑 🛑 Do not touch everything below here... 🛑 🛑 🛑

const KRAKEN_API_PUBLIC_KEY = process.env.KRAKEN_API_PUBLIC_KEY; // Kraken API public key
const KRAKEN_API_PRIVATE_KEY = process.env.KRAKEN_API_PRIVATE_KEY; // Kraken API private key
const crypto = require("crypto");
const https = require("https");

const isWeekend = (date) => date.getDay() % 6 == 0;

let now = new Date();
let nextFiatDropDate = new Date(
  `${now.getFullYear()}-${now.getMonth() + 1}-${DATE_OF_CASH_REFILL}`
);
if (nextFiatDropDate < now) {
  nextFiatDropDate.setDate(1); //Needed because later used 'setMonth' has a weird implementation logic.
  nextFiatDropDate.setMonth(nextFiatDropDate.getMonth() + 1);
  nextFiatDropDate.setDate(DATE_OF_CASH_REFILL + 1); // We add 1 to make sure we don't run out of fiat in the end. This will set the date right to the start of the next day.
}

if (isWeekend(nextFiatDropDate)) nextFiatDropDate.setDate(nextFiatDropDate.getDate() + 1)
// If first time was SA, next day will be SU, so we have to repeat the check.
if (isWeekend(nextFiatDropDate)) nextFiatDropDate.setDate(nextFiatDropDate.getDate() + 1)

const millisUntilNextFiatDrop = nextFiatDropDate - now;

async function QueryPublicEndpoint(endPointName, inputParameters) {
  let jsonData;
  const baseDomain = "https://api.kraken.com";
  const publicPath = "/0/public/";
  const apiEndpointFullURL =
    baseDomain + publicPath + endPointName + "?" + inputParameters;

  const options = {
    hostname: "api.kraken.com",
    port: 443,
    path: `${publicPath}${endPointName}?${inputParameters || ""}`,
    method: "GET",
  };

  const data = await new Promise((resolve, reject) => {
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
    });

    req.end();
  });

  return JSON.parse(data);
}

async function QueryPrivateEndpoint(
  endPointName,
  inputParameters,
  apiPublicKey,
  apiPrivateKey
) {
  // const baseDomain = "https://api.kraken.com";
  const privatePath = "/0/private/";

  // const apiEndpointFullURL =
  //   baseDomain + privatePath + endPointName + "?" + inputParametsers;
  const nonce = Date.now().toString();
  const apiPostBodyData = "nonce=" + nonce + "&" + inputParameters;

  const signature = CreateAuthenticationSignature(
    apiPrivateKey,
    privatePath,
    endPointName,
    nonce,
    apiPostBodyData
  );

  const result = await new Promise((resolve, reject) => {
    const body = apiPostBodyData;
    const options = {
      hostname: "api.kraken.com",
      port: 443,
      path: `${privatePath}${endPointName}${
        inputParameters ? `?${inputParameters}` : ""
      }`,
      method: "POST",
      headers: { "API-Key": apiPublicKey, "API-Sign": signature },
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

  return JSON.parse(result);
}

function CreateAuthenticationSignature(
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
  let privateInputParameters =
    `pair=xbtchf&type=buy&ordertype=market&volume=${KRAKEN_MIN_BTC_ORDER_SIZE}` ;
  let privateResponse = "";
  privateResponse = await QueryPrivateEndpoint(
    privateEndpoint,
    privateInputParameters,
    KRAKEN_API_PUBLIC_KEY,
    KRAKEN_API_PRIVATE_KEY
  );
  console.log(privateResponse);
}

const Main = async () => {
  try {
    console.log("|=========================================|");
    console.log("|            ------------------           |");
    console.log("|            |   Kraken DCA   |           |");
    console.log("|            ------------------           |");
    console.log("|               by @codepleb              |");
    console.log("|                                         |");
    console.log("| Donations BTC:                          |");
    console.log("| Donations Lightning BTC:                |");
    console.log("|=========================================|");
    console.log();
    console.log("DCA activated now!");

    if (1 == 1) {
      // executeBuyOrder();

      let btcFiatPrice = (
        await QueryPublicEndpoint("Ticker", `pair=xbt${CURRENCY.toLowerCase()}`)
      ).result[`XBT${CURRENCY}`].p[0];
      console.log(`BTC-Price: ${btcFiatPrice}`);

      let privateEndpoint = "Balance";
      let privateInputParameters = "";

      privateResponse = (
        await QueryPrivateEndpoint(
          privateEndpoint,
          privateInputParameters,
          KRAKEN_API_PUBLIC_KEY,
          KRAKEN_API_PRIVATE_KEY
        )
      ).result;

      const fiatAmount = privateResponse[CURRENCY];
      const myFiatValueInBtc = btcFiatPrice / fiatAmount;
      const approximatedAmoutOfOrdersUntilFiatRefill = myFiatValueInBtc / KRAKEN_MIN_BTC_ORDER_SIZE;
      const timeUntilNextOrderExecuted = millisUntilNextFiatDrop / approximatedAmoutOfOrdersUntilFiatRefill;
      const exactTimeDelayUntilNextOrder = now + timeUntilNextOrderExecuted;

      console.log("Current Price:", fiatAmount);
    }

    /*
     * PRIVATE REST API Examples
     */

    if (1 == 0) {
      let btcchfPrice = await QueryPublicEndpoint("Ticker", "pair=xbtchf");
      

      const EAO = 0; // Estimated Amount of Orders

      let privateResponse = "";

      let privateEndpoint = "AddOrder";
      let privateInputParameters =
        "pair=xbtchf&type=buy&ordertype=market&volume=5000";

      privateResponse = await QueryPrivateEndpoint(
        privateEndpoint,
        privateInputParameters,
        KRAKEN_API_PUBLIC_KEY,
        KRAKEN_API_PRIVATE_KEY
      );
      console.log(privateResponse);
    }

    console.log("|=======================================|");
    console.log("|             DCA stopped!              |");
    console.log("|=======================================|");
  } catch (e) {
    console.log();
    console.log("AN EXCEPTION OCCURED :(");
    console.log(e);
  }
};

Main();
