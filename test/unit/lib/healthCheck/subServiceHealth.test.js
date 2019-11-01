'use strict'

const Sinon = require('sinon')
const {
  statusEnum,
  serviceName
} = require('@mojaloop/central-services-shared').HealthCheck.HealthCheckEnums

const Mailer = require('../../../../src/nodeMailer/sendMail')
const Consumer = require('../../../../src/lib/kafka/consumer')
const {
  getSubServiceHealthBroker,
  getSubServiceHealthSMTP
} = require('../../../../src/lib/healthCheck/subServiceHealth')

const mailer = Mailer.sharedInstance()

describe('SubServiceHealth test', () => {
  let sandbox

  beforeEach(() => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Consumer, 'getListOfTopics')
    sandbox.stub(Consumer, 'isConnected')
    sandbox.stub(mailer.transporter, 'verify')
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('getSubServiceHealthSMTP', () => {
    it('should pass when transporter.verify() suceeds', async () => {
      mailer.transporter.verify.resolves()
      const expected = { name: serviceName.smtpServer, status: statusEnum.OK }
      expect(getSubServiceHealthSMTP()).resolves.toEqual(expected)
    })

    it('should fail when transporter.verify() fails', async () => {
      mailer.transporter.verify.throws(new Error('Authentication failed'))
      const expected = { name: serviceName.smtpServer, status: statusEnum.DOWN }
      expect(getSubServiceHealthSMTP()).resolves.toEqual(expected)
    })
  })

  describe('getSubServiceHealthBroker', () => {
    it('should broker test passes when there are no topics', async () => {
      Consumer.getListOfTopics.returns([])
      const expected = { name: serviceName.broker, status: statusEnum.OK }
      expect(getSubServiceHealthBroker()).resolves.toEqual(expected)
    })

    it('broker test fails when one broker cannot connect', async () => {
      Consumer.getListOfTopics.returns(['admin1', 'admin2'])
      Consumer.isConnected.throws(new Error('Not connected!'))
      const expected = { name: serviceName.broker, status: statusEnum.DOWN }
      expect(getSubServiceHealthBroker()).resolves.toEqual(expected)
    })

    it('Passes when it connects', async () => {
      Consumer.getListOfTopics.returns(['admin1', 'admin2'])
      Consumer.isConnected.resolves(true)
      const expected = { name: serviceName.broker, status: statusEnum.OK }
      expect(getSubServiceHealthBroker()).resolves.toEqual(expected)
    })
  })
})
