const Deepstream = require('deepstream.io')
const ZMQConnector = require('deepstream.io-msg-zmq')
const CacheClusterConnector = require('..')
const deepstream = require('deepstream.io-client-js')
const path = require('path')

const PORT = 3003

const server = new Deepstream({
  port: 6022
})

let messageConnector = new ZMQConnector({
  address: `tcp://127.0.0.1:${PORT}`,
  peers: ['tcp://127.0.0.1:3001', 'tcp://127.0.0.1:3002']
})
server.set('messageConnector', messageConnector)

let cacheConnector = new CacheClusterConnector({
  server: server,
  filename: path.join(__dirname, 'data', `${PORT}.json`)
})
server.set('cache', cacheConnector)

server.start()

const client = deepstream('localhost:6022', {
  mergeStrategy: deepstream.REMOTE_WINS
}).login({username: 'user3', password: ''})
client.on('error', (error, event, topic) => {
  console.log(error, event, topic)
})

let record = client.record.getRecord('test')
setInterval(() => {
  record.set('time', Date.now())
}, 100)
