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
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>
 * JJ Geewax <jjg@google.com>
 --------------
 ******/

'use strict'

/**
 * @module src/lib/kafka/consumer
 */

const util = require('util')

const KafkaConsumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const Logger = require('@mojaloop/central-services-shared').Logger
const Utility = require('../utility')
const ErrorHandler = require('@mojaloop/central-services-error-handling')

let _topicConsumerMetadata = {}

class Consumer {
  static get _topicConsumerMetadata () {
    return _topicConsumerMetadata
  }

  static set _topicConsumerMetadata (value) {
    _topicConsumerMetadata = value
  }

  /**
   * @function getConsumerMetadata
   *
   * @param {string} topicName - the topic name to locate a specific consumer
   *
   * @description This is used to retrieve a consumer for a given topic name
   *
   * @returns {Consumer} - Returns the registered consumer for a given topic name
   * @throws {Error} - if no consumer is found for a topic name
   */
  static getConsumerMetadata (topicName) {
    const metadata = this._topicConsumerMetadata
    if (topicName in metadata) {
      return metadata[topicName]
    } else {
      // If the topicName doesn't exist in the map, throw an error.
      throw ErrorHandler.Factory.createInternalServerFSPIOPError(
        `No consumer found for topic ${topicName}`)
    }
  }

  static setConsumerMetadata (topicName, metadata) {
    if (topicName === undefined || topicName === null) {
      throw new Error('Missing topic name.')
    }
    this._topicConsumerMetadata[topicName] = metadata
  }

  static clearConsumerMetadata (topicName) {
    const metadata = this._topicConsumerMetadata
    if (topicName === undefined) {
      this._topicConsumerMetadata = {}
    } else if (topicName in metadata) {
      delete metadata[topicName]
    }
  }

  /**
   * @function getListOfTopics
   *
   * @description Get a list of topics that the consumer has subscribed to
   *
   * @returns {Array<string>} - list of topics
   */
  static getListOfTopics () {
    return Object.keys(this._topicConsumerMetadata)
  }

  /**
   * @function getKafkaConsumer
   *
   * @param {string} topicName - the topic name to locate a specific consumer
   *
   * @description This is used to get a consumer with the topic name to commit
   *              the messages that have been received
   *
   * @returns {Consumer} - Returns consumer
   * @throws {Error} - if consumer not found for topic name
   */
  static getKafkaConsumer (topicName) {
    const metadata = this.getConsumerMetadata(topicName)
    return metadata.consumer
  }

  /**
   * @function getConsumer
   *
   * @param {string} topicName - the topic name to locate a specific consumer
   *
   * @description This is used to get a consumer with the topic name to commit
   *              the messages that have been received
   *
   * @returns {Consumer} - Returns consumer
   * @throws {Error} - if consumer not found for topic name
   */
  static getConsumer (topicName) {
    // This is just here for legacy reasons
    return this.getKafkaConsumer(topicName)
  }

  /**
   * @function isConsumerAutoCommitEnabled
   *
   * @param {string} topicName - the topic name to locate a specific consumer
   *
   * @description This is used to get a consumer with the topic name to commit
   *              the messages that have been received
   *
   * @returns {Boolean} - Returns whether or not AutoCommit is enabled for this
   *                      consumer
   * @throws {Error} - if consumer not found for topic name
   */
  static isConsumerAutoCommitEnabled (topicName) {
    const metadata = this.getConsumerMetadata(topicName)
    return metadata.autoCommitEnabled
  }

  static _coerceToArray (values) {
    if (Array.isArray(values)) {
      return values
    } else {
      return [values]
    }
  }

  /**
   * @function CreateHandler
   *
   * @param {string | Array<string>} topicName - the topic name or names to be
   *        registered for the required handler.
   *        Example: 'topic-dfsp1-transfer-prepare'
   * @param {object} config - the config for the consumer for the specific
   *        functionality and action, retrieved from the default.json.
   *        Example: found in default.json 'KAFKA.CONSUMER.TRANSFER.PREPARE'
   * @param {function} command - the callback handler for the topic. Will be
   *        called when the topic is produced against.
   *        Example: Command.prepareHandler()
   *
   * @description Creates handlers for the given topic name(s), and adds to
   *              topicConsumerMap
   */
  static async createHandler (topicName, config, command) {
    const topicNameArray = this._coerceToArray(topicName)

    // Always log that we're trying to create a consumer for specific topics.
    Logger.info(`CreateHandle::connect - creating Consumer for topics: ` +
                `[${topicNameArray}]`)

    // Create a new kafka consumer.
    const consumer = new KafkaConsumer(topicNameArray, config)

    // Figure out whether auto-commit is enabled and keep track of that.
    let autoCommitEnabled = true
    if (config.rdkafkaConf !== undefined &&
        config.rdkafkaConf['enable.auto.commit'] !== undefined) {
      autoCommitEnabled = config.rdkafkaConf['enable.auto.commit']
    }

    // Try to establish the connection.
    // TODO: This should be connectedTimestamp (not TimeStamp).
    let connectedTimeStamp = 0
    try {
      await consumer.connect()
      Logger.info(`CreateHandle::connect - successfully connected to topics: ` +
                  `[${topicName}]`)
      connectedTimeStamp = (new Date()).valueOf()
      await consumer.consume(command)
    } catch (e) {
      // Don't throw the error, keep track of the topic we tried to connect to
      Logger.warn(`CreateHandle::connect - error: ${e.message}`)
    }

    // Once the connection is established (maybe), store the consumer info and
    // other metadata in topicConsumerMap.
    topicNameArray.forEach(topicName => {
      this.setConsumerMetadata(topicName, {
        consumer,
        autoCommitEnabled,
        connectedTimeStamp
      })
    })
  }

  /**
   * @function registerNotificationHandler
   *
   * @description This is used to register the handler for the Notification topic
   *              according to a specified Kafka congfiguration
   *
   * @returns true
   * @throws {Error} - if handler failed to create
   */
  static async registerNotificationHandler () {
    // Create a topic name.
    const topicName = Utility.transformGeneralTopicName(
      Utility.ENUMS.NOTIFICATION,
      Utility.ENUMS.EVENT)

    // Create the Kafka config.
    const config = Utility.getKafkaConfig(
      Utility.ENUMS.CONSUMER,
      Utility.ENUMS.NOTIFICATION.toUpperCase(),
      Utility.ENUMS.EVENT.toUpperCase())
    config.rdkafkaConf['client.id'] = topicName

    // Try to create the handler and wait to establish a connection. Then return
    // true to indicate success.
    try {
      await this.createHandler(topicName, config)
      await this.isConnected(topicName)
      return true
    } catch (err) {
      // Log and throw a more specific error type.
      Logger.error(err)
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  }

  /**
   * @function isConnected
   *
   * @param {string} topicName - the topic name of the consumer to check
   *
   * @description Use this to determine whether or not we are connected to the
   *              broker. Internally, it calls `getMetadata` to determine
   * if the broker client is connected.
   *
   * @returns {true} - if connected
   * @throws {Error} - if consumer can't be found or the consumer isn't connected
   */
  static async isConnected (topicName) {
    // This "module.exports" thing is important for mocking in the tests.
    // TODO: Rearrange this file so that we don't need to do this.
    const consumer = this.getConsumer(topicName)
    const getMetadata = util.promisify(consumer.getMetadata)
    const metadata = await getMetadata({
      topicName,
      timeout: 3000
    })
    const foundTopics = metadata.topics.map(topic => topic.name)
    if (foundTopics.indexOf(topicName) === -1) {
      Logger.debug(`Connected to consumer, but ${topicName} not found.`)
      throw ErrorHandler.Factory.createInternalServerFSPIOPError(
        `Connected to consumer, but ${topicName} not found.`)
    }

    return true
  }
}

module.exports = Consumer
