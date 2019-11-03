const Sinon = require('sinon')
const Proxyquire = require('proxyquire')

describe('Setup', () => {
  let sandbox,
    setupProxy,
    subStub,
    pipeStub,
    operatorsStub,
    conStub,
    ConsumerStub,
    UtilityStub,
    RxStub,
    ObservablesStub,
    createHealthCheckServerStub,
    HealthCheckConstructorStub

  const topicName = 'test-topic'
  beforeEach(() => {
    sandbox = Sinon.createSandbox()

    conStub = {
      commitMessageSync: sandbox.stub().returns(async function () { return true }),
      consume: sandbox.stub().resolves(),
      _status: { running: true }
    }

    subStub = {
      subscribe: sandbox.stub().returns(true)
    }

    pipeStub = {
      pipe: sandbox.stub().returns(subStub)
    }

    RxStub = {
      Observable: {
        create: sandbox.stub().returns(pipeStub)
      }
    }

    operatorsStub = {
      filter: sandbox.stub().returns(() => {}),
      switchMap: sandbox.stub().returns(() => {})
    }

    ObservablesStub = {
      actionObservable: sandbox.stub()
    }

    HealthCheckConstructorStub = sandbox.stub()
    const mockHealthCheck = class HealthCheckStubbed {
      constructor () {
        HealthCheckConstructorStub()
      }
    }

    createHealthCheckServerStub = sandbox.stub().returns()

    UtilityStub = {
      trantransformGeneralTopicName: sandbox.stub().returns(topicName)
    }

    ConsumerStub = {
      registerNotificationHandler: sandbox.stub().resolves(),
      isConsumerAutoCommitEnabled: sandbox.stub().returns(true),
      getConsumer: sandbox.stub().returns(conStub)
    }

    setupProxy = Proxyquire('../../src/setup', {
      rxjs: RxStub,
      './observables': ObservablesStub,
      '@mojaloop/central-services-health': {
        createHealthCheckServer: createHealthCheckServerStub,
        defaultHealthHandler: () => {}
      },
      '@mojaloop/central-services-shared': {
        HealthCheck: {
          HealthCheck: mockHealthCheck,
          HealthCheckEnums: {
            serviceName: {
              broker: 'broker'
            }
          }
        }
      },
      'rxjs/operators': operatorsStub,
      './lib/utility': UtilityStub,
      './lib/kafka/consumer': ConsumerStub
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('setup should', async () => {
    expect(await setupProxy.setup()).toBe('Notifier setup finished')
    expect(createHealthCheckServerStub.calledOnce).toBe(true)
    // createHealthCheckServerStub.withArgs(Config.get('PORT'), (r, h) => {})
    expect(HealthCheckConstructorStub.calledOnce).toBe(true)
    expect(RxStub.Observable.create.calledOnce).toBe(true)
    expect(operatorsStub.filter.calledOnce).toBe(true)
  })
})
