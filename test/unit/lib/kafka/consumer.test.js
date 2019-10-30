/*****
  License
  --------------
  Copyright © 2017 Bill & Melinda Gates Foundation
  The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

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

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Lewis Daly <lewis@vesselstech.com>
 * JJ Geewax <jjg@google.com>

 --------------
 ******/
'use strict'

const src = '../../../../src'
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const rewire = require('rewire')
const KafkaConsumer = require('@mojaloop/central-services-stream').Kafka.Consumer

const Consumer = require(`${src}/lib/kafka/consumer`)

Test('Consumer', ConsumerTest => {
  let sandbox

  ConsumerTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(KafkaConsumer.prototype, 'constructor').resolves()
    sandbox.stub(KafkaConsumer.prototype, 'connect').resolves()
    sandbox.stub(KafkaConsumer.prototype, 'consume').resolves()
    sandbox.stub(KafkaConsumer.prototype, 'commitMessageSync').resolves()
    sandbox.stub(KafkaConsumer.prototype, 'getMetadata').resolves()
    test.end()
  })

  ConsumerTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  ConsumerTest.test('isConnected should', isConnectedTest => {
    isConnectedTest.test('return true if connected', async test => {
      const topicName = 'admin'
      const config = { rdkafkaConf: {} }
      const metadata = {
        orig_broker_id: 0,
        orig_broker_name: 'kafka:9092/0',
        topics: [
          { name: 'admin', partitions: [] }
        ],
        brokers: [{ id: 0, host: 'kafka', port: 9092 }]
      }

      // getConsumer() should return a fake consumer whose getMetadata()
      // method executes a callback returning mockMetadata.
      sandbox.stub(Consumer, 'getConsumer').returns({
        getMetadata: sandbox.stub().callsArgWith(1, null, metadata)
      })

      await Consumer.createHandler(topicName, config)
      const result = await Consumer.isConnected(topicName)
      test.equal(result, true, 'The consumer is connected')
      test.end()
    })

    isConnectedTest.test('throw if the topic cannot be found', async test => {
      const topicName = 'random-topic'
      // Don't register any topics

      try {
        await Consumer.isConnected(topicName)
        test.fail('should have thrown an exception')
      } catch (err) {
        test.equal(err.message, `No consumer found for topic ${topicName}`,
          'The error messages match.')
        test.pass('Threw an exception when the topic was not found')
      }

      test.end()
    })

    isConnectedTest.test('throw if not connected', async test => {
      const topicName = 'admin'
      const config = { rdkafkaConf: {} }
      const metadata = {
        orig_broker_id: 0,
        orig_broker_name: 'kafka:9092/0',
        topics: [
          { name: 'not-admin', partitions: [] }
        ],
        brokers: [{ id: 0, host: 'kafka', port: 9092 }]
      }

      // getConsumer() should return a fake consumer whose getMetadata()
      // method executes a callback returning mockMetadata.
      sandbox.stub(Consumer, 'getConsumer').returns({
        getMetadata: sandbox.stub().callsArgWith(1, null, metadata)
      })

      await Consumer.createHandler(topicName, config)

      try {
        await Consumer.isConnected(topicName)
        test.fail('should have thrown an exception')
      } catch (err) {
        test.equal(err.message, `Connected to consumer, but ${topicName} not found.`, 'The error messages match.')
        test.pass('Threw an exception when the topic was not found')
      }

      test.end()
    })

    isConnectedTest.end()
  })

  ConsumerTest.test('createHandler should', createHandlerTest => {
    createHandlerTest.test('not throw error if it fails to connect', async (test) => {
      const topicName = 'admin'
      const config = { rdkafkaConf: {} }
      KafkaConsumer.prototype.constructor.throws(new Error())
      KafkaConsumer.prototype.connect.throws(new Error())

      try {
        await Consumer.createHandler(topicName, config)
        test.pass('Created handler in spite of failure to connect.')
      } catch (err) {
        test.fail(`Should not have thrown err: ${err.message}`)
      }

      test.end()
    })

    createHandlerTest.test('handle arrays', async (test) => {
      const topicName = ['admin2', 'admin1']
      const config = { rdkafkaConf: {} }
      try {
        await Consumer.createHandler(topicName, config)
        test.pass('passed')
      } catch (err) {
        test.fail('Error Thrown')
      }
      test.end()
    })

    createHandlerTest.test('topic is still added if fails to connect', async (test) => {
      const topicName = 'test-with-failure-to-connect'
      const config = { rdkafkaConf: {} }
      KafkaConsumer.prototype.connect.throws(new Error())

      // Since this topic shouldn't exist, this should throw.
      test.throws(() => Consumer.getConsumer(topicName))

      // After we create a handler, this should no longer throw.
      await Consumer.createHandler(topicName, config)
      test.doesNotThrow(() => Consumer.getConsumer(topicName))

      test.end()
    })

    createHandlerTest.test('should have a timestamp of 0 if couldn\'t connect', async test => {
      const topicNames = ['admin2', 'admin1']
      const config = { rdkafkaConf: {} }
      KafkaConsumer.prototype.connect.throws(new Error())

      await Consumer.createHandler(topicNames, config)
      for (const topicName of topicNames) {
        const metadata = Consumer.getConsumerMetadata(topicName)
        test.equal(metadata.connectedTimeStamp, 0, 'Timestamps should be 0')
      }

      test.end()
    })

    createHandlerTest.test('should contain a timestamp of when it connected', async test => {
      // Arrange
      const ConsumerProxy = rewire(`${src}/lib/kafka/consumer`)
      const topicName = ['admin2', 'admin1']
      const config = { rdkafkaConf: {} }
      // KafkaConsumer.prototype.connect.throws(new Error())

      // Act
      await ConsumerProxy.createHandler(topicName, config)
      const result = ConsumerProxy.__get__('topicConsumerMap')
      const timestamps = Object.keys(result).map(k => result[k].connectedTimeStamp)

      // Assert
      timestamps.forEach(ts => test.ok(ts > 0, 'Timestamp should be greater than 0'))
      test.end()
    })

    createHandlerTest.end()
  })

  ConsumerTest.test('getListOfTopics should', getListOfTopicsTest => {
    getListOfTopicsTest.test('return an empty array when there are no topics', test => {
      const ConsumerProxy = rewire(`${src}/lib/kafka/consumer`)
      ConsumerProxy.__set__('topicConsumerMap', {})
      const expected = []

      const result = ConsumerProxy.getListOfTopics()

      test.deepEqual(result, expected, 'Should return an empty array')
      test.end()
    })

    getListOfTopicsTest.test('return a list of topics', test => {
      const ConsumerProxy = rewire(`${src}/lib/kafka/consumer`)
      ConsumerProxy.__set__('topicConsumerMap', { admin1: {}, admin2: {} })
      const expected = ['admin1', 'admin2']

      const result = ConsumerProxy.getListOfTopics()

      test.deepEqual(result, expected, 'Should return an empty array')
      test.end()
    })

    getListOfTopicsTest.end()
  })

  ConsumerTest.test('getConsumer should', getConsumerTest => {
    const topicName = 'admin'
    const expected = 'consumer'

    getConsumerTest.test('return list of consumers', async (test) => {
      // TODO: This test is at the wrong level of abstraction. It doesn't
      // actually test anything important and should be removed.
      const ConsumerProxy = rewire(`${src}/lib/kafka/consumer`)
      ConsumerProxy.__set__('topicConsumerMap', {
        admin: {
          consumer: expected
        }
      })
      try {
        const result = await ConsumerProxy.getConsumer(topicName)
        test.equal(result, expected)
      } catch (err) {
        test.fail()
      }
      test.end()
    })

    getConsumerTest.test('throw error', async (test) => {
      try {
        await Consumer.getConsumer('invalid-topic-name')
        test.fail('Error not thrown')
      } catch (err) {
        test.pass('Successfully threw error')
      }
      test.end()
    })

    getConsumerTest.end()
  })

  ConsumerTest.test('isConsumerAutoCommitEnabled should', isConsumerAutoCommitEnabledTest => {
    const topicName = 'invalid-topic-name'

    isConsumerAutoCommitEnabledTest.test('throw error', async (test) => {
      try {
        await Consumer.isConsumerAutoCommitEnabled(topicName)
        test.fail('Error not thrown!')
      } catch (err) {
        test.pass('Successfully threw error')
      }
      test.end()
    })

    isConsumerAutoCommitEnabledTest.test('return result', async (test) => {
      const topics = ['admin2', 'admin1']
      const config = { rdkafkaConf: {} }
      await Consumer.createHandler(topics, config)

      try {
        const result = await Consumer.isConsumerAutoCommitEnabled('admin1')
        test.equal(result, true, 'isConsumerAutoCommitEnabled is true')
      } catch (err) {
        test.fail(`Should not have thrown err: ${err.message}`)
      }
      test.end()
    })

    isConsumerAutoCommitEnabledTest.end()
  })

  ConsumerTest.test('registerNotificationHandler should', async registerTests => {
    registerTests.test('fail if the Consumer fails to connect', async test => {
      KafkaConsumer.prototype.constructor.throws(new Error())
      KafkaConsumer.prototype.connect.throws(new Error('Failed to connect'))
      KafkaConsumer.prototype.getMetadata.throws(new Error('Failed to get metadata'))

      try {
        await Consumer.registerNotificationHandler()
        test.fail('Should have thrown an error')
      } catch (err) {
        test.pass('Successfully threw error when attempting to connect to consumer')
      }

      test.end()
    })

    registerTests.test('connect to the consumer', async test => {
      sandbox.stub(Consumer, 'isConnected').resolves(true)

      try {
        await Consumer.registerNotificationHandler()
        test.pass('Successfully connected to the consumer')
      } catch (err) {
        test.fail('Should not have thrown an error')
      }

      test.end()
    })

    registerTests.end()
  })

  ConsumerTest.end()
})
