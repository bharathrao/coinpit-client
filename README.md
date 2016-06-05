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

```