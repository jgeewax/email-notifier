'use strict'

const Uuid = require('uuid4')
const Utility = require('../../../src/lib/utility')

const TRANSFER = 'transfer'
const PREPARE = 'prepare'
const NOTIFICATION = 'notification'
const EVENT = 'event'
const CONSUMER = 'CONSUMER'

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
    header: {},
    payload: transfer
  },
  metadata: {
    event: {
      id: Uuid(),
      type: 'prepare',
      action: 'commit',
      createdAt: new Date(),
      state: {
        status: 'success',
        code: 0,
        description: 'action successful'
      }
    }
  },
  pp: ''
}

describe('Utility', () => {
  describe('updateMessageProtocolMetadata', () => {
    it('should return an updated metadata object in the message protocol', () => {
      const previousEventId = messageProtocol.metadata.event.id
      const newMessageProtocol = Utility.updateMessageProtocolMetadata(
        messageProtocol, TRANSFER, PREPARE, Utility.ENUMS.STATE.SUCCESS)
      const eventData = newMessageProtocol.metadata.event
      expect(eventData.state).toEqual(Utility.ENUMS.STATE.SUCCESS)
      expect(eventData.type).toEqual(TRANSFER)
      expect(eventData.action).toEqual(PREPARE)
      expect(eventData.responseTo).toEqual(previousEventId)
    })

    it('should return an updated metadata object in the message protocol if metadata is not present', () => {
      const newMessageProtocol = Utility.updateMessageProtocolMetadata(
        {}, TRANSFER, PREPARE, Utility.ENUMS.STATE.SUCCESS)
      const eventData = newMessageProtocol.metadata.event
      expect(eventData.state).toEqual(Utility.ENUMS.STATE.SUCCESS)
      expect(eventData.type).toEqual(TRANSFER)
      expect(eventData.action).toEqual(PREPARE)
    })
  })

  describe('getKafkaConfig', () => {
    it('should return the Kafka config from the default.json', () => {
      const config = Utility.getKafkaConfig(
        CONSUMER, NOTIFICATION.toUpperCase(), EVENT.toUpperCase())
      expect(config.rdkafkaConf).not.toBe(undefined)
      expect(config.options).not.toBe(undefined)
    })

    it('should throw and error if Kafka config not in default.json', () => {
      expect(() => {
        Utility.getKafkaConfig(CONSUMER, NOTIFICATION, EVENT)
      }).toThrow()
    })
  })

  describe('createState should', () => {
    it('should create a state', () => {
      const state = {
        status: 'status',
        code: 1,
        description: 'description'
      }
      expect(Utility.createState(state.status, state.code, state.description))
        .toEqual(state)
    })
  })
})
