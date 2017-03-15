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
  address: 'tcp://localhost:3001',
  peers: ['tcp://localhost:3002']
})
server.set('messageConnector', messageConnector)

let cacheConnector = new CacheClusterConnector({
  server: server,
  filename: './data/3001.json',
  flushInterval: 60000
})
server.set('cache', cacheConnector)

server.start() 
```

## Config

- server - deepstream server instance. When omited, cache will work as local only.
- filename - filename of JSON cache shapshot. Path for this file must already exists.
- flushInterval - interval between file writes, ms. Default 30000
