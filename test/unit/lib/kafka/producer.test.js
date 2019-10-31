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

 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>
 * JJ Geewax <jjg@google.com>

 --------------
 ******/
'use strict'

const src = '../../../../src/'
const Sinon = require('sinon')
const KafkaProducer = require('@mojaloop/central-services-stream').Kafka.Producer
const Producer = require(`${src}/lib/kafka/producer`)
const Uuid = require('uuid4')

const transfer = {
  transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8999',
  payerFsp: 'dfsp1',
  payeeFsp: 'dfsp2',
  amount: {
    currency: 'USD',
    amount: '433.88'
  },
  ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
  condition: 'YlK5TZyhflbXaDRPtR5zhCu8FrbgvrQwwmzuH0iQ0AI',
  expiration: '2016-05-24T08:38:08.699-04:00',
  extensionList: {
    extension: [
      {
        key: 'key1',
        value: 'value1'
      },
      {
        key: 'key2',
        value: 'value2'
      }
    ]
  }
}

const messageProtocol = {
  id: transfer.transferId,
  from: transfer.payerFsp,
  to: transfer.payeeFsp,
  type: 'application/json',
  content: {
    header: '',
    payload: transfer
  },
  metadata: {
    event: {
      id: Uuid(),
      type: 'prepare',
      action: 'prepare',
      createdAt: new Date(),
      state: {
        status: 'success',
        code: 0
      }
    }
  },
  pp: ''
}

let topicConf

describe('Producer', () => {
  let sandbox
  const config = {}

  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(KafkaProducer.prototype, 'constructor').resolves()
    sandbox.stub(KafkaProducer.prototype, 'connect').resolves()
    sandbox.stub(KafkaProducer.prototype, 'sendMessage').resolves()
    sandbox.stub(KafkaProducer.prototype, 'disconnect').resolves()
    Producer.listOfProducers = {}
    topicConf = {
      topicName: 'topic-dfsp1-transfer-prepare',
      key: 'producerTest',
      partition: 0,
      opaqueKey: 0
    }
  })

  afterEach(() => {
    sandbox.restore()
  })


  describe('produceMessage', () => {
    it('should return true', async () => {
      expect(Producer.produceMessage(messageProtocol, topicConf, config))
        .resolves.toBe(true)
    })

    it('should disconnect specific topic correctly', async () => {
      topicConf.topicName = 'someTopic'
      await Producer.produceMessage(messageProtocol, topicConf, config)
      expect(Producer.disconnect(topicConf.topicName)).resolves.not.toThrow()
    })

    it('should not throw an error when disconnecting multiple producers', async () => {
      // Register two producers lazily by producing two messages (one for each
      // topic).
      await Producer.produceMessage(
        messageProtocol, { topicName: 'topic1' }, config)
      await Producer.produceMessage(
        messageProtocol, { topicName: 'topic2' }, config)

      // Disconnecting should work across all of them.
      expect(Producer.disconnect()).resolves.not.toThrow()
    })

    it('should call producer.disconnect() on each producer', async () => {
      const topicNames = ['topic1', 'topic2', 'topic3']
      // Register two producers lazily by producing two messages (one for each
      // topic).
      for (let topicName of topicNames) {
        await Producer.produceMessage(messageProtocol, { topicName }, config)
      }

      // Now trigger the disconnect of all producers.
      await Producer.disconnect()

      // Finally, verify that each producer.disconnect() method was called.
      // NOTE: These were mocked in the beforeEach() method.
      for (let producer of topicNames.map((t) => Producer.getProducer(t))) {
        expect(producer.disconnect.called).toBe(true)
      }
    })
  })

  describe('getProducer', () => {
    it('should return a specific Producer if it exists', async () => {
      const topicName = 'test'
      // Create a producer lazily by producing a message.
      await Producer.produceMessage({}, { topicName }, {})

      // Verify that retrieving the producer doesn't throw an error.
      expect(() => {
        Producer.getProducer(topicName)
      }).not.toThrow()
    })

    it('should throw an exception for an unknown producer', async () => {
      expect(() => {
        Producer.getProducer('undefined')
      }).toThrow('No producer found for topic undefined')
    })
  })

  describe('disconnect should', () => {
    it('should disconnect from kafka', async () => {
      // TODO: Remove this?
      await Producer.produceMessage({}, { topicName: 'test' }, {})
      expect(Producer.disconnect('test')).resolves.not.toThrow()
    })

    it('should disconnect specific topic correctly', async () => {
      const topicName = 'someTopic'
      await Producer.produceMessage({}, { topicName: topicName }, {})
      expect(Producer.disconnect(topicName)).resolves.not.toThrow()
    })

    it('should disconnect all topics correctly', () => {
      let topicName = 'someTopic1'
      expect(Producer.produceMessage({}, { topicName }, {}))
        .resolves.toBe(true)
      expect(Producer.disconnect(topicName)).resolves.not.toThrow()

      topicName = 'someTopic2'
      expect(Producer.produceMessage({}, { topicName }, {}))
        .resolves.toBe(true)
      expect(Producer.disconnect()).resolves.not.toThrow()
    })

    it('should throw error if any topics fail to disconnect', async () => {
      return
      const topicNameSuccess = 'topic1'
      const topicNameFailure = 'topic-fail'

      await Producer.produceMessage({}, { topicName: topicNameSuccess }, {})
      await Producer.produceMessage({}, { topicName: topicNameFailure }, {})

      // Make sure the failing topic name is mocked to fail disconnecting.
      Producer.getProducer(topicNameFailure).disconnect.throws()

      // Expect the disconnect() call to fail for this one.
      expect(Producer.disconnect()).rejects.toThrow(
        `Error: The following Producers could not be disconnected:
        [{"topic":"${topicNameFailure}","error":"No producer found for topic
        ${topicNameFailure}"}]`)

      // Also expect that the disconnect() method was called on the successful
      // topic.
      const successProducer = Producer.getProducer(topicNameSuccess)
      expect(successProducer.disconnect.called).toBe(true)
    })

    it('should throw error if topic does not exist', async () => {
      expect(Producer.disconnect('any-topic-name')).rejects.toThrow()
    })

    it('throw error for invalid topic names', () => {
      const badTopicName = {}
      expect(Producer.disconnect(badTopicName)).rejects.toThrow()
    })
  })

  describe('produceMessage', () => {
    it('should throw error when connect throws error', async () => {
      KafkaProducer.prototype.connect.throws()
      topicConf.topicName = 'invalidTopic'
      expect(Producer.produceMessage(messageProtocol, topicConf, config))
        .rejects.toThrow()
    })
  })
})
