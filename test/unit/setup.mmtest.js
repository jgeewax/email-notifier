/*  HOT observeable is the topicObservable
    COLD are the rest observables */

const marbles = require('rxjs-marbles/tape').marbles
const Sinon = require('sinon')
const Test = require('tapes')(require('tape'))
const { filter, switchMap } = require('rxjs/operators')
const Mailer = require('../../src/nodeMailer/sendMail')
const Config = require('../../src/lib/config')

const Observables = require('../../src/observables/actions')
const hubName = Config.get('HUB_PARTICIPANT').NAME

Test('Test the action observables Setup', marbles((m, t) => {
  const sandbox = Sinon.createSandbox()
  sandbox.stub(Mailer.prototype, 'sendMailMessage')
  const emailer = new Mailer()
  emailer.sendMailMessage.resolves(true)

  t.plan(2)

  const mockMessage = {
    value: {
      from: hubName,
      to: 'dfsp1',
      id: '694dd040-a315-4427-bcf0-e29229c4defe',
      content: {
        header: {},
        payload: {
          from: Config.get('HUB_PARTICIPANT').hubName,
          to: 'dfsp1',
          recepientDetails: {
            _id: '5bf5480aa305f9801a6d59db',
            name: 'dfsp1',
            type: 'NET_DEBIT_CAP_ADJUSTMENT',
            value: 'dean.bothma@modusbox.com',
            action: 'sendEmail',
            createdAt: '2018-11-21T11:56:58.919Z',
            updatedAt: '2018-11-21T14:00:38.993Z',
            __v: 0
          },
          hubDetails: {
            _id: '5bf5480aa305f9801a6d59dd',
            name: 'Hub',
            type: 'NET_DEBIT_CAP_ADJUSTMENT',
            value: 'dean.bothma@modusbox.com',
            action: 'sendEmail',
            createdAt: '2018-11-21T11:56:58.950Z',
            updatedAt: '2018-11-21T14:00:39.077Z',
            __v: 0
          },
          messageDetails: {
            dfsp: 'dfsp1',
            limitType: 'NET_DEBIT_CAP',
            value: 1000,
            currency: 'USD',
            triggeredBy: '5bf5480ba305f9801a6d59e0',
            repetitionsAllowed: 3,
            fromEvent: '5bf5480ba305f9801a6d59e4',
            action: 'sendEmail',
            notificationEndpointType: 'NET_DEBIT_CAP_ADJUSTMENT',
            templateType: 'adjustment',
            language: 'en',
            messageSubject: 'NET_DEBIT_CAP LIMIT ADJUSTMENT',
            notificationInterval: 3,
            resetPeriod: 60
          }
        }
      },
      type: 'application/json',
      metadata: {
        event: {
          id: '4276f87a-0a17-485f-acb8-f2d582a1f608',
          responseTo: '88d15b71-ae0d-4e31-a285-c3fdd5982180',
          type: 'notification',
          action: 'event',
          createdAt: '2018-12-11T13:36:58.225Z',
          state: { status: 'success', code: 0, description: 'action successful' }
        },
        'protocol.createdAt': 1544535418447
      },
      pp: ''
    },
    size: 1363,
    key: {
      type: 'Buffer',
      data: [51, 48, 55, 54, 50, 51, 49, 55, 45, 54, 48, 97, 48, 45, 52, 98, 102, 52, 45, 98, 98, 97, 97, 45, 100, 50, 49, 50, 53, 101, 49, 100, 54, 52, 50, 97]
    },
    topic: 'topic-notification-event',
    offset: 4,
    partition: 0,
    timestamp: 1544535418448
  }

  const inputs = {
    a: mockMessage,
    b: {}
  }

  const outputs = {
    r: {
      dfspMailResult: true,
      hubMailResult: true
    }
  }

  const source = m.cold('-a', inputs) // topic observable
  const subs = '^a'
  const expected = m.cold('-r', outputs)

  const destination = source
    .pipe(filter(data => data.value.from === hubName),
      switchMap(Observables.actionObservable))

  // const subscription = destination.subscribe()
  m.expect(source).toHaveSubscriptions(subs)
  m.expect(destination).toBeObservable(expected)

  t.end()
}))