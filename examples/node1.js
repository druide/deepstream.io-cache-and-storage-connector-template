const Deepstream = require('deepstream.io')
const ZMQConnector = require('deepstream.io-msg-zmq')
const CacheClusterConnector = require('..')
const deepstream = require('deepstream.io-client-js')
const path = require('path')

const PORT = 3001

const server = new Deepstream()

let messageConnector = new ZMQConnector({
  address: `tcp://127.0.0.1:${PORT}`,
  peers: ['tcp://127.0.0.1:3002', 'tcp://127.0.0.1:3003']
})
server.set('messageConnector', messageConnector)

let cacheConnector = new CacheClusterConnector({
  server: server,
  filename: path.join(__dirname, 'data', `${PORT}.json`)
})
server.set('cache', cacheConnector)

server.start()

const client = deepstream('localhost:6020', {
  mergeStrategy: deepstream.REMOTE_WINS
}).login({username: 'user1', password: ''})
client.on('error', (error, event, topic) => {
  console.log(error, event, topic)
})

let record = client.record.getRecord('test')
setInterval(() => {
  record.set('time', Date.now())
}, 50)
