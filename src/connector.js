'use strict'

const events = require('events')
const pckg = require('../package.json')
const fs = require('fs')
const C = require('deepstream.io').constants
const JsonPath = require('deepstream.io/src/record/json-path')

/**
 * A template that can be forked to create cache or storage connectors
 * for [deepstream](http://deepstream.io)
 *
 * Cache connectors are classes that connect deepstream to an in-memory cache, e.g. Redis, Memcached,
 * IronCache or Amazon's elastic cache
 *
 * Storage connectors are classes that connect deepstream to a database, e.g. MongoDB, CouchDB, Cassandra or
 * Amazon's DynamoDB. They can also be used with relational databases, but deepstream's data-structures (blocks
 * of JSON, identified by a key) lends itself very well to object/document based databases.
 *
 * Whats this class used for?
 *
 * Both cache and storage connectors expose the same interface and offer similar functionality,
 * yet their role is a little bit different.
 *
 * Deepstream servers don't hold any data themselves. This allows the individual servers to remain
 * stateless and to go down / fail over without causing any data-loss, but it also allows for
 * the data to be distributed across multiple nodes.
 *
 * Whenever deepstream has to store something, its written to the cache in a blocking fashion, but written to
 * storage in a non blocking way. (Well, its NodeJS, so it's not really 'blocking', but the next callback for
 * this particular update won't be processed until the cache operation is complete)
 *
 * Similarly, whenever an entry needs to be retrieved, deepstream looks for it in the cache first and in storage
 * second. This means that the cache needs to be very fast - and fortunately most caches are. Both Redis and Memcached
 * have proven to be able to return queries within the same millisecond.
 *
 * So why have this distinction between cache and storage at all? Because they complement each other quite well:
 *
 * - Caches need to make a relatively small amount of data accessible at very high speeds. They achieve that by storing
 *   the data in memory, rather than on disk (although some, e.g. Redis, write to disk as well). This means that
 *   all data is lost when the process exists. Caches also usually don't offer support for elaborate querying.
 *
 * - Databases (storage) offer long-term storage of larger amounts of data and allow for more elaborate ways of querying.
 *   (full-text search, SQL etc.)
 *
 * Some considerations when implementing a cache/storage connector
 *
 * - this.isReady starts as false. Once the connection to the cache / storage is established, emit a 'ready' event and set
 *   it to true
 *
 * - Whenever a generic error occurs (e.g. an error that's not directly related to a get, set or delete operation, raise
 *   an error event and send the error message as a parameter, e.g. this.emit( 'error', 'connection lost' ) )
 *
 * - whenever an error occurs as part of a get, set or delete operation, pass it to the callback as the first argument,
 *   otherwise pass null
 *
 * - values for set() will be serializable JavaScript objects and are expected to be returned by get as such. It's
 *   therefor up to this class to handle serialisation / de-serialisation, e.g. as JSON or message-pack. Some
 *   systems (e.g. MongoDB) however can also handle raw JSON directly
 */
class Connector extends events.EventEmitter {

  /* @param {Object} options Any options the connector needs to connect to the cache/db and to configure it.
  *
  * @constructor
  */
  constructor (options) {
    super()
    this.isReady = false
    this.name = pckg.name
    this.version = pckg.version
    this.data = {}

    this.server = options.server
    this.messageConnector = this.server ? this.server._options.messageConnector : null

    let afterOpen = () => {
      if (this.messageConnector) {
        this.cb = this.recordCallback.bind(this)
        this.messageConnector.subscribe(C.TOPIC.RECORD, this.cb)
      }

      this.isReady = true
      this.emit('ready')
    }

    this.filename = options.filename
    if (this.filename) {
      this.flushInterval = options.flushInterval || 30000
      fs.readFile(this.filename, 'utf8', (err, data) => {
        if (err) {
          if (err.code !== 'ENOENT') return this.emit('error', err)
        } else {
          try {
            this.data = JSON.parse(data)
          } catch (e) {
            return this.emit('error', err)
          }
        }
        afterOpen()
      })
    } else {
      process.nextTick(afterOpen)
    }
  }

  /**
   * Record listener to update records by messages from other deepstream nodes
   * @param  {Object} msg
   */
  recordCallback (msg) {
    let key = msg.data[0]
    let version = parseInt(msg.data[1], 10)
    if (msg.action === C.ACTIONS.PATCH) {
      let path = msg.data[2]
      let value = this.server.convertTyped(msg.data[3])
      if (!this.data[key]) this.data[key] = {_d: {}}
      new JsonPath(path).setValue(this.data[key]._d, value)
      this.data[key]._v = version
      this.sheduleSave()
    } else if (msg.action === C.ACTIONS.UPDATE) {
      let value = this.server.convertTyped(msg.data[2])
      if (!this.data[key]) this.data[key] = {}
      this.data[key]._d = value
      this.data[key]._v = version
      this.sheduleSave()
    } else if (msg.action === C.ACTIONS.DELETE) {
      if (this.data[key]) delete this.data[key]
      this.sheduleSave()
    }
  }

  /**
  * Writes a value to the connector.
  *
  * @param {String}   key
  * @param {Object}   value
  * @param {Function} callback Should be called with null for successful set operations or with an error message string
  *
  * @private
  * @returns {void}
  */
  set (key, value, callback) {
    if (value === undefined) {
      delete this.data[key]
    } else {
      this.data[key] = value
    }
    this.sheduleSave()
    callback(null)
  }

  /**
  * Retrieves a value from the connector.
  *
  * @param {String}   key
  * @param {Function} callback Will be called with null and the stored object
  *                            for successful operations or with an error message string
  *
  * @returns {void}
  */
  get (key, callback) {
    callback(null, this.data[key])
  }

  /**
  * Deletes an entry from the connector.
  *
  * @param   {String}   key
  * @param   {Function} callback Will be called with null for successful deletions or with
  *                     an error message string
  *
  * @returns {void}
  */
  delete (key, callback) {
    this.set(key, undefined, callback)
  }

  /**
   * Gracefully close the connector and any dependencies.
   *
   * Called when deepstream.close() is invoked.
   * If this method is defined, it must emit 'close' event to notify deepstream of clean closure.
   *
   * (optional)
   *
   * @public
   * @returns {void}
   */
  close () {
    if (this.messageConnector) {
      this.messageConnector.unsubscribe(C.TOPIC.RECORD, this.cb)
    }
    if (!this.filename) return this.emit('close')
    this.save(() => {
      this.emit('close')
    })
  }

  /**
   * Shedule save data to file if not in progress yet
   */
  sheduleSave () {
    if (this.filename && !this.saveTimeout) {
      this.saveTimeout = setTimeout(this.save.bind(this), this.flushInterval)
    }
  }

  /**
   * Save data to file
   * @param  {Function} callback
   */
  save (callback) {
    this.saveTimeout = null
    fs.writeFile(this.filename, JSON.stringify(this.data), 'utf8', (err) => {
      if (err) this.emit('error', err)
      if (callback) callback()
    })
  }
}

module.exports = Connector
