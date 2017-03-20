const Deepstream = require('deepstream.io')
const ZMQConnector = require('deepstream.io-msg-zmq')
const CacheClusterConnector = require('..')
const deepstream = require('deepstream.io-client-js')
const path = require('path')

const PORT = 3002

const server = new Deepstream({
  port: 6021
})

let messageConnector = new ZMQConnector({
  address: `tcp://127.0.0.1:${PORT}`,
  peers: ['tcp://127.0.0.1:3001', 'tcp://127.0.0.1:3003']
})
server.set('messageConnector', messageConnector)

let cacheConnector = new CacheClusterConnector({
  server: server,
  filename: path.join(__dirname, 'data', `${PORT}.json`)
})
server.set('cache', cacheConnector)

server.start()

const client = deepstream('localhost:6021', {
  mergeStrategy: deepstream.REMOTE_WINS
}).login({username: 'user2', password: ''})
client.on('error', (error, event, topic) => {
  console.log(error, event, topic)
})

let record = client.record.getRecord('test')
record.subscribe('time', (test) => {
  console.log(test)
}, true)
