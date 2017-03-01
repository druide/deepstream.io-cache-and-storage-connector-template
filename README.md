# deepstream.io-cache-simple-cluster

A [deepstream.io](http://deepstream.io/) cache connector for simple in-memory cluster cache.
This connector uses deepstream's message connector to synchronize data.

```javascript
const DeepstreamServer = require('deepstream.io')
const ZMQConnector = require('deepstream.io-msg-zmq')
const CacheClusterConnector = require('deepstream.io-cache-simple-cluster')

const server = new DeepstreamServer({
  host: 'localhost',
  port: 6020
})

let messageConnector = new ZMQConnector({
  pubAddress: 'tcp://localhost:3001',
  subAddress: 'tcp://localhost:3002'
})
server.set('messageConnector', messageConnector)

let cacheConnector = new CacheClusterConnector({
  messageConnector: messageConnector,
  filename: './data/3001.json'
})
server.set('cache', cacheConnector)

server.start() 
```

## Config

- messageConnector - deepstream's message connector instance. When omited, cache will work as local only.
- filename - filename of JSON cache shapshot. Path for this file must already exists.
- flushInterval - interval between file writes, ms. Default 10000
