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
 * This app assumes, that you deposit FIAT once a month.
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
const MIN_BTC_ORDER_SIZE = 0.0001; // Kraken currently has a minimum order size of 0.0001 BTC. Can be changed, but should be the standard for the next few years I think.

// 🛑 🛑 🛑 Do not touch everything below here... 🛑 🛑 🛑

const KRAKEN_API_PUBLIC_KEY = process.env.KRAKEN_API_PUBLIC_KEY; // Kraken API public key
const KRAKEN_API_PRIVATE_KEY = process.env.KRAKEN_API_PRIVATE_KEY; // Kraken API private key
const crypto = require("crypto");

let d = new Date();

const CASH_REFILL_DATE = new Date(
  `${d.getYear()}-${d.getMonth() + 1}-${DATE_OF_CASH_REFILL}`
);

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
      let btcchfPrice = (
        await QueryPublicEndpoint("Ticker", `pair=xbt${CURRENCY.toLowerCase()}`)
      ).result[`XBT${CURRENCY}`].p[0];
      console.log(`BTC-Price: ${btcchfPrice}`);

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

      const CHFleft = privateResponse[CURRENCY];

      console.log("Current Price:", CHFleft);
    }

    /*
     * PRIVATE REST API Examples
     */

    if (1 == 0) {
      let btcchfPrice = await QueryPublicEndpoint("Ticker", "pair=xbtchf");
      const isWeekend = (date) => date.getDay() % 6 == 0;

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

  const https = require("https");

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
      const https = require("https");
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
      //   const httpOptions = {
      //     headers: { "API-Key": apiPublicKey, "API-Sign": signature },
      //   };

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

      const https = require("https");
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

    // let jsonData = await axios.post(
    //   apiEndpointFullURL,
    //   apiPostBodyData,
    //   httpOptions
    // );

    // return jsonData.data.result;
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
};

Main();
