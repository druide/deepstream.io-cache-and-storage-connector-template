'use strict'

/* global describe, it */
const expect = require('chai').expect
const CacheConnector = require('../src/connector')
const EventEmitter = require('events').EventEmitter
const settings = {}

describe('the cache/storage connector has the correct structure', () => {
  var cacheConnector

  it('creates the cacheConnector', (done) => {
    cacheConnector = new CacheConnector(settings)
    expect(cacheConnector.isReady).to.equal(false)
    cacheConnector.on('ready', done)
  })

  it('implements the cache/storage connector interface', () => {
    expect(cacheConnector.name).to.be.a('string')
    expect(cacheConnector.version).to.be.a('string')
    expect(cacheConnector.get).to.be.a('function')
    expect(cacheConnector.set).to.be.a('function')
    expect(cacheConnector.delete).to.be.a('function')
    expect(cacheConnector instanceof EventEmitter).to.equal(true)
  })

  it('retrieves a non existing value', (done) => {
    cacheConnector.get('someValue', (error, value) => {
      expect(error).to.equal(null)
      expect(value).to.equal(undefined)
      done()
    })
  })

  it('sets a value', (done) => {
    cacheConnector.set('someValue', {_d: {v: 10}, firstname: 'Wolfram'}, (error) => {
      expect(error).to.equal(null)
      done()
    })
  })

  it('retrieves an existing value', (done) => {
    cacheConnector.get('someValue', (error, value) => {
      expect(error).to.equal(null)
      expect(value).to.deep.equal({_d: {v: 10}, firstname: 'Wolfram'})
      done()
    })
  })

  it('deletes a value', (done) => {
    cacheConnector.delete('someValue', (error) => {
      expect(error).to.equal(null)
      done()
    })
  })

  it('Can\'t retrieve a deleted value', (done) => {
    cacheConnector.get('someValue', (error, value) => {
      expect(error).to.equal(null)
      expect(value).to.equal(undefined)
      done()
    })
  })
})
