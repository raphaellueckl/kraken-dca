# kraken-dca

A flexible DCA executor for the cryptocurrency exchange kraken.com!
In-Depth **English** and **German** videos below. Everyone of you can do this, trust me!

Please send me feedback! If this is worth something to you, feel free to throw me some Sats:
- via Bitcoin mainnet: `bc1qut5yvlmr228ct3978ks4y3ar0xhr4vz8j946gv`
- via Bitcoin Lightning (telegram): `codepleb@ln.tips`

**Tested currencies that work: `EUR, USD, CHF`.** Others might work as well, but I only tested with those three. Feel free to test it with others, as the worst you can get is an error message. :)

## What does it do?

It buys Bitcoin for you at every price. The more fiat money you deposit onto Kraken, the more frequent you will be buying bitcoin! This works thanks to the algorithm taking the minimum possible order size on kraken and executing it as many times as possible, so that you run out of FIAT when the next FIAT drop is supposed to happen!

At the time of writing this readme, when you deposit 1500 euro each month, you would buy bitcoin approximaltely every two hours. If you deposit 3000 Euro each month, you would buy every hour!

Example: You deposit FIAT money every month worth 0.01 BTC. The minimum order size on Kraken is 0.0001 BTC (minimum trade volume). 0.01 / 0.0001 == 100 orders over the next month. Until the next FIAT deposit, it will equally spread 100 buy orders over time. The amount of orders cannot really be absolutely esimated at the beginning, but it will be recalculated after every buy, because if the BTC price would double during that time, the amount of orders possible will obviously become half as much.

## Why?

If you suck at trading, but believe in the vision of Bitcoin, then fire up this script and chill. You will still buy the tops, but also the dips! You weaken one of your biggest enemies: Psychology!

Kraken is by far the cheapest option that I know. Kraken has one of the best prices and a very high trading volume. The fees always remain very low and withdrawals cost less than a dollar!

## What are the preconditions?

The script assumes that you deposit money once a month and if that day is a weekend (saturday or sunday), it will automatically be taken into consideration.

## How can I make it run? (Extremely basic videos below if you don't understand it)

- Create an API key in your Kraken account with ONLY the options `Query Funds` and `Create & Modify Orders`. IMPORTANT: If you want to let the script automatically withdraw funds to your private wallet, also select the option `Withdraw Funds`. Selecting other choices will be a risk to your account and does not provide any advantage!
- Start the script by opening a terminal and entereing the following into a terminal (do not write the '<>' characters):
  - Schema: `KRAKEN_API_PUBLIC_KEY=<your public key> KRAKEN_API_PRIVATE_KEY=<your private key> KRAKEN_WITHDRAWAL_ADDRESS_KEY=<'description' of your withdrawal address> WITHDRAW_TARGET=<number> CURRENCY=<your currency, e.g. USD / EUR / CHF> SHOW_BTC_VALUE=<true> DATE_OF_CASH_REFILL=<1 to 28> node app.js`
  - Example script start - Minimal Version: `KRAKEN_API_PUBLIC_KEY=8b9j4hD7mhPVDAoDZrZ8BPsJWoBCQ0XmBMPPb4LPBDpMjpXPgD4sc+Ps KRAKEN_API_PRIVATE_KEY=Xbg0kGG1qtvCnuFu9pLSk8pnWq8xSXVo/qg9p58CVqSSWYQ=uv1gUJ7eYpf9Fp4rnpBggpm4n597FjHuHvHgSo== CURRENCY=EUR DATE_OF_CASH_REFILL=24 node app.js`
  - Example script start - 'Including Withdrawals'-Version: `KRAKEN_API_PUBLIC_KEY=8b9j4hD7mhPVDAoDZrZ8BPsJWoBCQ0XmBMPPb4LPBDpMjpXPgD4sc+Ps KRAKEN_API_PRIVATE_KEY=Xbg0kGG1qtvCnuFu9pLSk8pnWq8xSXVo/qg9p58CVqSSWYQ=uv1gUJ7eYpf9Fp4rnpBggpm4n597FjHuHvHgSo== CURRENCY=USD WITHDRAW_TARGET=0.1 KRAKEN_WITHDRAWAL_ADDRESS_KEY="my ledger nano" DATE_OF_CASH_REFILL=11 SHOW_BTC_VALUE=true node app.js`

- Leave the script running for as long as you want to keep buying. :) A buy order will instantly trigger as soon as you start the script (if you have some money left).

## A note on withdrawals

Adding the parameter `KRAKEN_WITHDRAWAL_ADDRESS_KEY` enables automated withdrawals, that will ALWAYS execute after the first order in a new month. If you do not want to withdraw monthly but rather when hitting a certain target of bitcion, you can override this behavior by also providing the `WITHDRAW_TARGET` parameter! So when you define a target, monthly withdrawals are automatically disabled.

Kraken does not allow withdrawals to random addresses. You have to register them [here](https://www.kraken.com/u/funding/withdraw?asset=BTC&method=0) under `Manage withdrawal addresses`. What Kraken calls "Address description" is what you need to set as `KRAKEN_WITHDRAWAL_ADDRESS_KEY`.

## Example on the full process for linux and macOS users

- Open a Terminal
- `cd ~ && mkdir kraken-dca-script && cd kraken-dca-script` ENTER
- `curl https://raw.githubusercontent.com/raphaellueckl/kraken-dca/master/app.js --output app.js` ENTER
- `KRAKEN_API_PUBLIC_KEY=8b9j4hD7mhPVDAoDZrZ8BPsJWoBCQ0XmBMPPb4LPBDpMjpXPgD4sc+Ps KRAKEN_API_PRIVATE_KEY=Xbg0kGG1qtvCnuFu9pLSk8pnWq8xSXVo/qg9p58CVqSSWYQ=uv1gUJ7eYpf9Fp4rnpBggpm4n597FjHuHvHgSo== CURRENCY=USD WITHDRAW_TARGET=0.1 KRAKEN_WITHDRAWAL_ADDRESS_KEY="my ledger nano" node app.js` (replace parameter values - like `CURRENCY=...` - with your custom data) ENTER
- DONE! If there are any errors you don't understand, update `Node` on your system. Node 17.8+ works fine.

Download Node here if you don't have it: https://nodejs.org/en/download/

## VIDEO! - Watch my videos explaining the FULL process so that each and everyone of you can come on board!
  
English Version: [YouTube Video](https://youtu.be/1uhF3MkOyXU)

German/Deutsch Version: [YouTube Video](https://youtu.be/m8KpXjiyEbQ)

## FAQ

> let's say I deposit $500 right now, and then a week or two from now decide to toss in another $100 or $200. does it adjust for that?

Yes! After every buy it checks "how much money is left", "how much time is left until the next deposit?" and when you add another 200$ you will be buying bitcoin more often (given the BTC price stays the same)!
