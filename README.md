# kraken-dca

A flexible DCA executor for the cryptocurrency exchange kraken.com!
English and German videos below!

## What does it do?

It buys Bitcoin for you at every price. The more fiat money you deposit onto Kraken, the more frequent you will be buying bitcoin! This works thanks to the algorithm taking the minimum possible order size on kraken and spreads them over time!

Example: You deposit FIAT money every month worth 0.01 BTC. The minimum order on Kraken is 0.0001. 0.01 / 0.0001 == 100. Until the next FIAT deposit, it will equally spread 100 buy orders. This cannot really be esimated at the beginning, but it will be recalculated after every buy (because if BTC price would double during that time, the amount of orders possible will obviously become half).

## Why?

Because it is way cheaper and way more frequent than anything you know so far. Kraken has one of the best prices and a very high trading volume. If you suck at trading but believe in the vision of Bitcoin, then fire up this script and chill, you will still buy the tops, but also the dips! :D

## What are the preconditions?

The script assumes that you deposit money once a month and if that day is a weekend (saturday or sunday), it will handle it automatically.

## How can I make it run? (Extremely basic videos below if you don't understand it)

- Create an API key in your Kraken account with ONLY the options "Query Funds" and "Create & Modify Orders". Selecting other choices will be a huge risk to all of your funds and does not provide any advantage!
- Start the script by opening a terminal and entereing the following into a terminal (do not write the '<>' characters):
  - Schema: KRAKEN_API_PUBLIC_KEY=<your public key> KRAKEN_API_PRIVATE_KEY=<your private key> CURRENCY=<your currency, e.g. USD / EUR / CHF> SHOW_BTC_VALUE=<true / false> node app.js
  - Example script start: KRAKEN_API_PUBLIC_KEY=8b9j4hD7mhPVDAoDZrZ8BPsJWoBCQ0XmBMPPb4LPBDpMjpXPgD4sc+Ps KRAKEN_API_PRIVATE_KEY=Xbg0kGG1qtvCnuFu9pLSk8pnWq8xSXVo/qg9p58CVqSSWYQ=uv1gUJ7eYpf9Fp4rnpBggpm4n597FjHuHvHgSo== CURRENCY=CHF SHOW_BTC_VALUE=true node app.js
- Leave the script running for as long as you want to keep buying as often as possible. :) A buy order will instantly trigger as soon as you start the script (if you have some money left on the exchange).

## Still too complex? Then watch my videos explaining the FULL process so that each and everyone of you can come on board! :)
  
  [ENGLISH! Create the keys, install node & how to use the script]()
  
  
  [German/Deutsch! Keys auf Kraken generieren, Node installieren & weitere Schritte]()
  
