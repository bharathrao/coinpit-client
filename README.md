# coinpit-client
Alpha

usage:
```
npm install --save coinpit-client
```

create a client 
``` javascript
    var cc = require('coinpit-client')('https://live.coinpit.io')
    var account;
    cc.getAccount(privateKey).then(function(acc){
        account = acc
    })
```

account api

```
// list of open orders
var openOrders = account.getOpenOrders()
/*
accountBalance Format:
{
     balance        : multisig balance + margin balance + profit or loss,
     availableMargin: available amount which can be used to place order,
     multisig       : multisig balance (exludes unconfirmed),
     margin         : margin balance (includes unconfirmed)
}
*/
var accountAbalance = account.getBalance()
// returns exchange bid ask
account.getBidAsk()

```

## Listening to different socket messages
```
// socket used by coinpit-client
var socket = account.socket
```

Following socket topics are available to listen

### trade: every time order matches. 
```
{"date":1476337002, "price":636.7,"volume":1, "instrument":"BTC1"}
```    

### orderbook: This message is published every minute 
```
{"bid":636.3,"ask":636.4,
"buy":[{"price":636.3,"numberOfOrders":1,"totalQuantity":1, "instrument":"BTC1"},{"price":636.2,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":636.1,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":636,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":635.9,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":635.8,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":635.7,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":635.6,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":635.5,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":635.4,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":635.3,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":635.2,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":635.1,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":635,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":634.9,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":634.8,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":634.7,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":634.6,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":634.5,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":634.4,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":634.3,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"}],
"sell":[{"price":636.4,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":636.5,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":636.6,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":636.7,"numberOfOrders":1,"totalQuantity":4, "instrument":"BTC1"},{"price":636.8,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":636.9,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":637,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":637.1,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":637.2,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":637.3,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":637.4,"numberOfOrders":1,"totalQuantity":2, "instrument":"BTC1"},{"price":637.5,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":637.6,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":637.7,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":637.8,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":637.9,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":638,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":638.1,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":638.2,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":638.3,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},{"price":"NONE","numberOfOrders":1,"totalQuantity":1, "instrument":"BTC1"}]
}
```

### difforderbook: real time orderbook changes
```
{
"buy":{"635":{"price":635,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"637":{"price":637,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"634.9":{"price":634.9,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"636.9":{"price":636.9,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"634.8":{"price":634.8,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"636.8":{"price":636.8,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"634.7":{"price":634.7,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"636.7":{"price":636.7,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"634.6":{"price":634.6,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"636.6":{"price":636.6,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"634.5":{"price":634.5,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"636.5":{"price":636.5,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"634.4":{"price":634.4,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"636.4":{"price":636.4,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"634.3":{"price":634.3,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"636.3":{"price":636.3,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"637.1":{"price":637.1,"numberOfOrders":1,"totalQuantity":1, "instrument":"BTC1"}},
"sell":{"637":{"price":637,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"639":{"price":639,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"636.4":{"price":636.4,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"638.4":{"price":638.4,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"636.5":{"price":636.5,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"638.5":{"price":638.5,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"636.6":{"price":636.6,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"638.6":{"price":638.6,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"636.7":{"price":636.7,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"638.7":{"price":638.7,"numberOfOrders":1,"totalQuantity":4, "instrument":"BTC1"},"636.8":{"price":636.8,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"638.8":{"price":638.8,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"636.9":{"price":636.9,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"638.9":{"price":638.9,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"},"637.1":{"price":637.1,"numberOfOrders":0,"totalQuantity":0, "instrument":"BTC1"},"639.1":{"price":639.1,"numberOfOrders":1,"totalQuantity":5, "instrument":"BTC1"}},"bid":637.1,"ask":637.2
}
```

### readonly: Whenever exchange is in maintenance mode.
```
{"readonly":true}
//or
{"readonly":false}
```

### priceband: index price used by coinpit
```
{"price":636.8,"lastProvider":"bitstamp","used":2,
"providers":{"gemini":{"price":638.4,"time":1476337867242},"okcoin":{"price":633.5,"time":1476309721150,"expired":true},"bitfinex":{"price":638.03,"time":1476309783712,"expired":true},"coinbase":{"price":634.46,"time":1476309824389,"expired":true},"bitstamp":{"price":635.3,"time":1476337961938}}
,"max":638.8,"min":634.8, "instrument":"BTC1"}
```

### ntp: client side and server side time to calculate time diff. This is used for nonce.
```
{"client":1476336962443,"server":1476336962542}
```


## Order manipulations. (examples are available at https://github.com/coinpit/coinpit-bots/blob/master/src/marketmakerBot.js)
- valid order Types: MKT (Market), LMT(Limit), STM(Stop-Market), SLM(Stop-Limit) 
- valid side: buy, sell    

```
// create order. 
/*
stopPrice and targetPrice are relative to order matching price.
*/
var orders = yield account.createOrders([{price:620.1, side:'buy', orderType:'LMT', stopPrice:1.0, targetPrice:2.0, "instrument":"BTC1"}])

// update order.
var orders = yield account.updateOrders([{"uuid":"0d42be40-93f4-11e6-9bce-18efd6b9331e","userid":"<usrid>","price":640},{"uuid":"0d429730-93f4-11e6-a7bb-abf70afc0d67","userid":"<usrid>","price":633.6}])

// remove order.
var result = yield account.cancelOrders([{"uuid":"0d42be40-93f4-11e6-9bce-18efd6b9331e"},{"uuid":"0d429730-93f4-11e6-a7bb-abf70afc0d67"}])

// Patch
/*
cancels: orders object with uuid (similar to remove orders above)
updated: list of orders to be updated (similar to update orders above)
creates: list of orders to be created (similar to create orders above)
merge: list of order uuids. make sure to provide both stop and target orders uuids.
split: uuid of order to be split and one quantity of the quantity 
*/
var payload = {
cancels:[
    {uuid:"059af9e0-9107-11e6-9d5f-ec4c64c1864f"},
    {uuid:"059af9e0-9107-11e6-9d5f-ec4c64c1865f"},
    ],
updates:[
    {"uuid":"0d42be40-93f4-11e6-9bce-18efd6b9331e","userid":"<usrid>","price":640},
    {"uuid":"0d429730-93f4-11e6-a7bb-abf70afc0d67","userid":"<usrid>","price":633.6}
    ],
creates:[
    {price:620.1, side:'buy', orderType:'LMT', stopPrice:1.0, targetPrice:2.0, "instrument":"BTC1"}
    ],
merge:[
    "e3d269d1-9424-11e6-bb76-970122dc4d3a",
    "e3d269d0-9424-11e6-9766-f5d52d60c65d",
    "e3406301-9424-11e6-b859-38f93e196d74",
    "e3406300-9424-11e6-9aa4-cf820243deeb"
    ],
split:{uuid:"e9bdc381-9424-11e6-80a3-95573a44c8ab","quantity":1}
}
var result = yield account.patchOrders(payload)
```

