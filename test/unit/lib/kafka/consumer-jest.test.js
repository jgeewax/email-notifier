/*****
  License
  --------------
  Copyright © 2017 Bill & Melinda Gates Foundation
  The Mojaloop files are made available by the Bill & Melinda Gates Foundation
  under the Apache License, Version 2.0 (the "License") and you may not use
  these files except in compliance with the License. You may obtain a copy of
  the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, the Mojaloop files
are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.

Contributors
--------------
This is the official list of the Mojaloop project contributors for this file.
Names of the original copyright holders (individuals or organizations)
should be listed with a '*' in the first column. People who have
contributed from an organization can be listed under the organization
that actually holds the copyright for their contributions (see the
Gates Foundation organization for an example). Those individuals should have
their names indented and be marked with a '-'. Email address can be added
optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * JJ Geewax <jjg@google.com>

 --------------
 ******/
'use strict'

//const Test = require('tapes')(require('tape'))
const sinon = require('sinon')
//const rewire = require('rewire')
const KafkaConsumer = require('@mojaloop/central-services-stream').Kafka.Consumer

// TODO: Make this a relative import based on your path (not a bunch of ..'s)
const src = '../../../../src'
const Consumer = require(`${src}/lib/kafka/consumer`).Consumer

describe('Consumer', () => {

  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    // Neuter Kafka
    sandbox.stub(KafkaConsumer.prototype, 'constructor').resolves()
    sandbox.stub(KafkaConsumer.prototype, 'connect').resolves()
    sandbox.stub(KafkaConsumer.prototype, 'consume').resolves()
    sandbox.stub(KafkaConsumer.prototype, 'commitMessageSync').resolves()
    sandbox.stub(KafkaConsumer.prototype, 'getMetadata').resolves()
  })

  afterEach(() => {
    sandbox.restore()
    Consumer.clearConsumerMetadata()
  })

  describe('Consumer Metadata', () => {

    describe('getConsumerMetadata', () => {
      it('should throw an error if no topic specified', () => {
        expect(() => {
          Consumer.getConsumerMetadata()
        }).toThrow()
      })

      it('should throw an error with an invalid topic', () => {
        expect(() => {
          Consumer.getConsumerMetadata('invalid')
        }).toThrow()
      })

      it('should throw an error with a null topic', () => {
        expect(() => {
          Consumer.getConsumerMetadata(null)
        }).toThrow()
      })

      it('should return metadata if available', () => {
        const topic = 'topic'
        const metadata = { key: 'value' }
        Consumer.setConsumerMetadata(topic, metadata)
        expect(Consumer.getConsumerMetadata(topic)).toEqual(metadata)
      })
    })

    describe('setConsumerMetadata', () => {
      it('should fail if missing a topic name', () => {
        expect(() => {
          Consumer.setConsumerMetadata()
        }).toThrow()
      })

      it('should fail if topic name is null', () => {
        expect(() => {
          Consumer.setConsumerMetadata(null, {})
        }).toThrow()
      })

      it('shoudl fail if topic name is undefined', () => {
        expect(() => {
          Consumer.setConsumerMetadata(undefined, {})
        }).toThrow()
      })
    })

    describe('clearConsumerMetadata', () => {
      it('should clear consumer metadata', () => {
        Consumer.setConsumerMetadata('topic', {})
        expect(Object.keys(Consumer._topicConsumerMetadata)).toHaveLength(1)
        Consumer.clearConsumerMetadata()
        expect(Object.keys(Consumer._topicConsumerMetadata)).toHaveLength(0)
      })

      it('should work the same on an empty object', () => {
        expect(Object.keys(Consumer._topicConsumerMetadata)).toHaveLength(0)
        Consumer.clearConsumerMetadata()
        expect(Object.keys(Consumer._topicConsumerMetadata)).toHaveLength(0)
      })

      it('should work on an individual topic', () => {
        Consumer.setConsumerMetadata('topic1', {})
        Consumer.setConsumerMetadata('topic2', {})
        expect(Object.keys(Consumer._topicConsumerMetadata)).toHaveLength(2)
        Consumer.clearConsumerMetadata('topic1')
        expect(Object.keys(Consumer._topicConsumerMetadata)).toHaveLength(1)
      })

      it('should work on a missing topic', () => {
        expect(Object.keys(Consumer._topicConsumerMetadata)).toHaveLength(0)
        Consumer.clearConsumerMetadata('doesnt exist')
        expect(Object.keys(Consumer._topicConsumerMetadata)).toHaveLength(0)
      })
    })

    describe('getKafkaConsumer', () => {
      it('should fail if missing a topic name', () => {
        expect(() => {
          Consumer.getKafkaConsumer()
        }).toThrow()
      })

      it('should fail if passed an undefined topic name', () => {
        expect(() => {
          Consumer.getKafkaConsumer(undefined)
        }).toThrow()
      })

      it('should fail if passed a null topic name', () => {
        expect(() => {
          Consumer.getKafkaConsumer(null)
        }).toThrow()
      })

      it('should return the consumer value if specified', () => {
        // This depends on the consumer being stored in the `consumer` property
        const topicName = 'topic-name'
        const spy = sandbox.spy()
        const metadata = {
          consumer: null
        }
        const stub = sandbox.stub(metadata, 'consumer').get(spy)
        Consumer.setConsumerMetadata(topicName, metadata)
        expect(spy.called).toBe(false)
        Consumer.getKafkaConsumer(topicName)
        expect(spy.called).toBe(true)
      })
    })

    describe('getConsumer', () => {
      it('should just call getKafkaConsumer', () => {
        const topicName = 'topic-name'
        const stub = sandbox.stub(Consumer, 'getKafkaConsumer')
        expect(stub.called).toBe(false)
          Consumer.getConsumer(topicName)
        expect(stub.called).toBe(true)
      })
    })

    describe('isConsumerAutoCommitEnabled', () => {
      it('should fail if topic name is missing', () => {
        expect(() => {
          Consumer.isConsumerAutoCommitEnabled()
        }).toThrow()
      })

      it('should fail if topic name is undefined', () => {
        expect(() => {
          Consumer.isConsumerAutoCommitEnabled(undefined)
        }).toThrow()
      })

      it('should fail if topic name is null', () => {
        expect(() => {
          Consumer.isConsumerAutoCommitEnabled(null)
        }).toThrow()
      })

      it('should return the autoCommit value if specified', () => {
        // This depends on the value being stored in a specific property
        const topicName = 'topic-name'
        const spy = sandbox.spy()
        const metadata = {
          autoCommitEnabled: null
        }
        const stub = sandbox.stub(metadata, 'autoCommitEnabled').get(spy)
        Consumer.setConsumerMetadata(topicName, metadata)
        expect(spy.called).toBe(false)
        Consumer.isConsumerAutoCommitEnabled(topicName)
        expect(spy.called).toBe(true)
      })
    })
  })

  describe('_coerceToArray', () => {
    // TODO: Add more tests for edge cases here.
    it('should convert single strings to an array', () => {
      expect(Consumer._coerceToArray('input')).toEqual(['input'])
    })

    it('should leave an array alone', () => {
      expect(Consumer._coerceToArray(['input'])).toEqual(['input'])
    })
  })

  describe('createHandler', () => {
    it('should not throw an error if it fails to connect', async () => {
      KafkaConsumer.prototype.constructor.throws()
      KafkaConsumer.prototype.connect.throws()
      await Consumer.createHandler('topic-name', {})
    })

    it('should accept an array of topic names', async () => {
      await Consumer.createHandler(['topic1', 'topic2'], {})
    })

    it('should still add consumer metadata if connection fails', async () => {
      KafkaConsumer.prototype.connect.throws()
      const topicName = 'topic-name'
      expect(() => {
        Consumer.getConsumerMetadata(topicName)
      }).toThrow()
      await Consumer.createHandler(topicName, {})
      expect(Consumer.getConsumerMetadata(topicName)).toBeInstanceOf(Object)
    })

    it('should have a 0 connect timestamp if connection failed', async () => {
      KafkaConsumer.prototype.connect.throws()
      const topicName = 'topic-name'
      await Consumer.createHandler(topicName, {})
      const metadata = Consumer.getConsumerMetadata(topicName)
      expect(metadata.connectedTimeStamp).toEqual(0)
    })

    it('should have a non-zero connect timestamp if successful', async () => {
      const topicName = 'topic-name'
      await Consumer.createHandler(topicName, {})
      const metadata = Consumer.getConsumerMetadata(topicName)
      expect(metadata.connectedTimeStamp).not.toEqual(0)
    })

    it('should have a non-zero connect timestamp if successful', async () => {
      const topicNames = ['topic1', 'topic2']
      await Consumer.createHandler(topicNames, {})
      for (let topicName of topicNames) {
        const metadata = Consumer.getConsumerMetadata(topicName)
        expect(metadata.connectedTimeStamp).not.toEqual(0)
      }
    })
  })

  describe('getListOfTopics', () => {
    it('should return an empty list by default', () => {
      expect(Consumer.getListOfTopics()).toHaveLength(0)
    })

    it('should return the list of topics', () => {
      expect(Consumer.getListOfTopics()).toHaveLength(0)
      Consumer.setConsumerMetadata('topic1', {})
      expect(Consumer.getListOfTopics()).toEqual(['topic1'])
      Consumer.setConsumerMetadata('topic2', {})
      expect(Consumer.getListOfTopics()).toEqual(['topic1', 'topic2'])
    })
  })

})
