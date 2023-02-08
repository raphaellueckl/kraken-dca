# kraken-dca

**LEGAL-DISCLAIMER: You run this bot completely at your own risk! I can't take any responsibility for what happens to you and all the points I make are just assumtions.**

A flexible "Dollar Cost Average" executor for the cryptocurrency exchange [Kraken](https://kraken.com/)!
In-Depth **English** and **German** videos below. Everyone of you can do this, trust me!

Please send me feedback! If this is worth something to you, feel free to throw me some Sats:

- via Bitcoin mainnet: `bc1q4et8wxhsguz8hsm46pnuvq7h68up8mlw6fhqyt`
- via Bitcoin Lightning (telegram): `codepleb@ln.tips`

**Tested currencies that work: `EUR, USD, GBP, CHF`.** Others might work as well, but I only tested with those four. Feel free to test it with others, as the worst you can get is an error message. :)

## What does it do?

It buys Bitcoin for you at every price.

The more fiat money you deposit onto Kraken, the more frequent you will be buying bitcoin! This works thanks to the algorithm taking the minimum possible order size on kraken and executing it as many times as possible, over the spread of a month, so that you run out of FIAT when the next FIAT drop is supposed to happen! You get your salary once a month? You deposit some of it to kraken once a month? Then this bot will be permanently buying bitcoin in the time in between.

At the time of writing this readme, when you deposit 500 euro each month, you would buy bitcoin approximaltely every three hours. If you deposit 1500 Euro each month, **you would buy every hour**!

Example: You deposit FIAT money every month, worth 0.01 BTC. The minimum order size on Kraken is 0.0001 BTC (minimum trade volume). 0.01 / 0.0001 == 100 orders over the next month. Until the next FIAT deposit, it will equally spread 100 buy orders over time. The amount of orders cannot really be absolutely esimated at the beginning, but it will be recalculated after every buy, because if the BTC price would double during that time, the amount of orders possible will obviously become half as much.

## Why?

If you suck at trading, but believe in the vision of Bitcoin, then fire up this bot and relax. You will still buy the tops, but also the dips! You weaken one of your biggest enemies: Psychology!

If you do that over the some time, you cannot be unhappy anymore. If the price of bitcoin rises, then your bitcoins are more valuable! If the price of bitcoin tanks, then you can buy cheaper and more often! You might change your perspective on markets, thanks to this bot.

Kraken is by far the cheapest option that I know. Kraken has one of the best prices and a very high trading volume. The fees always remain very low and withdrawals cost less than a dollar! Plus it is said the be the most secure exchange to this date. Their focus on security is pretty high and they never had a known hack, although they run one of the oldest exchange out there.

## What are the preconditions?

The bot assumes that you deposit money once a month and if that day is a weekend (saturday or sunday), it will automatically be taken into consideration.

## How can I make it run? (Extremely basic videos below if you don't understand it)

### Option 1 - The Standard Way

- Create an API key in your Kraken account with ONLY the options `Query Funds` and `Create & Modify Orders`. IMPORTANT: If you want to let the bot automatically withdraw funds to your private wallet, also select the option `Withdraw Funds`. Selecting other choices will be a risk to your account and does not provide any advantage!
- Start the bot by opening a terminal and entereing the following into a terminal (do not write the '<>' characters):

  - Schema: `KRAKEN_API_PUBLIC_KEY=<your public key> KRAKEN_API_PRIVATE_KEY=<your private key> KRAKEN_WITHDRAWAL_ADDRESS_KEY=<'description' of your withdrawal address> WITHDRAW_TARGET=<number> CURRENCY=<your currency, e.g. USD / EUR / CHF / GBP> FIAT_CHECK_DELAY=<number in milliseconds, default: 600000> node bot.js`
  - Example bot start - Minimal Version: `KRAKEN_API_PUBLIC_KEY=8b9j4hD7mhPVDAoDZrZ8BPsJWoBCQ0XmBMPPb4LPBDpMjpXPgD4sc+Ps KRAKEN_API_PRIVATE_KEY=Xbg0kGG1qtvCnuFu9pLSk8pnWq8xSXVo/qg9p58CVqSSWYQ=uv1gUJ7eYpf9Fp4rnpBggpm4n597FjHuHvHgSo== node bot.js`
  - Example bot start - 'Including Withdrawals'-Version: `KRAKEN_API_PUBLIC_KEY=8b9j4hD7mhPVDAoDZrZ8BPsJWoBCQ0XmBMPPb4LPBDpMjpXPgD4sc+Ps KRAKEN_API_PRIVATE_KEY=Xbg0kGG1qtvCnuFu9pLSk8pnWq8xSXVo/qg9p58CVqSSWYQ=uv1gUJ7eYpf9Fp4rnpBggpm4n597FjHuHvHgSo== CURRENCY=USD WITHDRAW_TARGET=0.1 KRAKEN_WITHDRAWAL_ADDRESS_KEY="my ledger nano" FIAT_CHECK_DELAY=600000 node bot.js`
  - **WINDOWS USERS BEWARE!** Your command looks like this (the "&&" characters separate each command and they need to be placed WITHOUT whitespaces around): `SET KRAKEN_API_PUBLIC_KEY=8b9j4hD7mhPVDAoDZrZ8BPsJWoBCQ0XmBMPPb4LPBDpMjpXPgD4sc+Ps&&SET KRAKEN_API_PRIVATE_KEY=Xbg0kGG1qtvCnuFu9pLSk8pnWq8xSXVo/qg9p58CVqSSWYQ=uv1gUJ7eYpf9Fp4rnpBggpm4n597FjHuHvHgSo==&&SET CURRENCY=USD&&SET WITHDRAW_TARGET=0.1&&SET KRAKEN_WITHDRAWAL_ADDRESS_KEY="my ledger nano"&&SET FIAT_CHECK_DELAY=600000&&node bot.js`

- Leave the bot running for as long as you want to keep buying. :) A buy order will instantly trigger as soon as you start the bot (if you have some money left).

#### Example on the full process for linux and macOS users

- Open a Terminal
- `cd ~ && mkdir kraken-dca-bot && cd kraken-dca-bot` ENTER
- `curl https://raw.githubusercontent.com/raphaellueckl/kraken-dca/master/bot.js --output bot.js` ENTER
- `KRAKEN_API_PUBLIC_KEY=8b9j4hD7mhPVDAoDZrZ8BPsJWoBCQ0XmBMPPb4LPBDpMjpXPgD4sc+Ps KRAKEN_API_PRIVATE_KEY=Xbg0kGG1qtvCnuFu9pLSk8pnWq8xSXVo/qg9p58CVqSSWYQ=uv1gUJ7eYpf9Fp4rnpBggpm4n597FjHuHvHgSo== CURRENCY=USD WITHDRAW_TARGET=0.1 KRAKEN_WITHDRAWAL_ADDRESS_KEY="my ledger nano" node bot.js` (replace parameter values - like `CURRENCY=...` - with your custom data) ENTER
- DONE! If there are any errors you don't understand, update `Node` on your system. Node 17.8+ works fine.

Download Node here if you don't have it: https://nodejs.org/en/download/

### Option 2 - The Docker Way (runs on Mac, Windows, Linux)

1. Download and install `docker`: https://docs.docker.com/get-docker/ (Windows users: Download and install `git` https://git-scm.com/downloads)
1. Clone this project: `git clone https://github.com/raphaellueckl/kraken-dca.git && cd kraken-dca`
1. Adapt the file `docker-compose.yml`: Add your kraken-keys, currency, and so on (only change the values in `environment`)
1. Open a terminal within that folder.
1. Run the command `docker compose up -d`

If you have questions, find further info below, where the parameters are explained and/or watch the videos! :)

## Environment Variables

These are the variables you add in the command that starts the bot. If you use docker, those reside within the `docker-compose.yml` file in the section `services -> bot -> environment`

```bash
# Values containing whitespaces NEED to be enclosed within "".
KRAKEN_API_PUBLIC_KEY: Your Kraken public key, created here: https://www.kraken.com/u/security/api/new

KRAKEN_API_PRIVATE_KEY: Kraken private key, created alongside the public key.

CURRENCY: One of: USD / EUR / CHF / GBP || DEFAULT: USD

DATE_OF_CASH_REFILL: Day of the month where you usually deposit fiat. E.g. 26 || DEFAULT: ignored

KRAKEN_WITHDRAWAL_ADDRESS_KEY: Name of the wallet, that you registered on kraken. E.g. trezor || DEFAULT: ignored

WITHDRAW_TARGET: If you accumulate X amount of bitcoin, initiate an automated withdrawal. E.g. 0.01 || DEFAULT: ignored

KRAKEN_BTC_ORDER_SIZE: Any Bitcoin amount above the default || DEFAULT: 0.0001

FIAT_CHECK_DELAY: Any number in milliseconds! || Default: 600000 (which is 10 minutes)

```

## Updates

### Standard Way

1. `cd ~/kraken-dca-bot`
1. `curl https://raw.githubusercontent.com/raphaellueckl/kraken-dca/master/bot.js --output bot.js`
1. Done. Start the bot.

### Docker Way

Disclaimer: I'm no docker expert and the following was user feedback.

1. `cd ~/kraken-dca`
1. `git pull`
1. `docker system prune -a` (I'm not sure if this is the best idea, but it seems to work)
1. `docker compose up -d`

## A note on withdrawals

Adding the parameter `KRAKEN_WITHDRAWAL_ADDRESS_KEY` enables automated withdrawals, that will ALWAYS execute on the first day of each new month, at approximately the time of when you started the bot. If you do not want to withdraw monthly but rather when hitting a certain target of accumulated bitcion, then you can override this behavior by also providing the `WITHDRAW_TARGET` parameter! So when you define a target, monthly withdrawals are automatically disabled and withdrawals will execute as soon as you accumulated as much as defined.

Kraken does not allow withdrawals to random addresses. You have to register them [here](https://www.kraken.com/u/funding/withdraw?asset=BTC&method=0) under `Manage withdrawal addresses`. What Kraken calls "Address description" is what you need to set as `KRAKEN_WITHDRAWAL_ADDRESS_KEY`.

## VIDEO! - Watch my videos explaining the FULL process so that each and everyone of you can come on board!

English Version: [YouTube Video](https://youtu.be/1uhF3MkOyXU)

German/Deutsch Version: [YouTube Video](https://youtu.be/m8KpXjiyEbQ)

## FAQ

> let's say I deposit $500 right now, and then a week or two from now decide to toss in another $100 or $200. does it adjust for that?

Yes! After every buy it checks "how much money is left", "how much time is left until the next deposit?" and when you add another 200$ you will be buying bitcoin more often (given the BTC price stays the same)!

> Isn't it more expensive to buy often compared to buy once a month, fee wise?

On Kraken, no! You pay fees in percentage to the value traded (Maker-Fees). You can read it up here: https://www.kraken.com/features/fee-schedule/#kraken-pro

> Why is the withdrawal address not variable?

Fix for that: It is, if you do it manually (restart the bot once a month, after each withdrawal, with a new address).

Answer: It's not possible because of (IMHO unnecessary) complexity and also because the privacy aspect is just made up. Kraken knows all of your withdrawal addresses and they could give the government information about it anyways. It's not that new addresses are unknown to any party, so adding this feature would be of no value.

## Stay up to date!

Discord channel for news and updates: https://discord.gg/TARdDh4hN8

Also feel free to contact me on telegram: @codepleb
