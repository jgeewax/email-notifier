/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation
 under the Apache License, Version 2.0 (the "License") and you may not use these
 files except in compliance with the License. You may obtain a copy of the
 License at http://www.apache.org/licenses/LICENSE-2.0
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
 * Valentin Genev <valentin.genev@modusbox.com>
 * Deon Botha <deon.botha@modusbox.com>
 --------------
 ******/

'use strict'

const Rx = require('rxjs')
const Logger = require('@mojaloop/central-services-shared').Logger
const loadTemplates = require('../../templates').loadTemplates
const Mustache = require('mustache')
const Mailer = require('../nodeMailer/sendMail')
const ErrorHandler = require('@mojaloop/central-services-error-handling')

const mailer = Mailer.sharedInstance()

const dictionary = {

  sendEmail: async ({ payload }) => {
    const path = `${payload.messageDetails.language}/${payload.messageDetails.templateType}`
    const templates = await loadTemplates(path, 'mustache')
    const dfspEmailBody = Mustache.render(templates.dfspEmail, payload.messageDetails)
    const hubEmailBody = Mustache.render(templates.hubEmail, payload.messageDetails)
    const dfspNotificationDetails = payload.recepientDetails
    const hubNotificationDetails = payload.hubDetails

    const dfspMessage = {
      priority: 'high',
      from: hubNotificationDetails.value,
      to: dfspNotificationDetails.value,
      subject: payload.messageDetails.messageSubject,
      text: dfspEmailBody
    }

    const hubMessage = {
      priority: 'high',
      from: hubNotificationDetails.value,
      to: hubNotificationDetails.value,
      subject: payload.messageDetails.messageSubject,
      text: hubEmailBody
    }

    const hubMailResult = await mailer.sendMailMessage(hubMessage)
    const dfspMailResult = await mailer.sendMailMessage(dfspMessage)
    return {
      dfspMailResult,
      hubMailResult
    }
  }
}

const actionBuilder = (action) => {
  if (action in dictionary) {
    return dictionary[action]
  } else {
    throw ErrorHandler.Factory.createInternalServerFSPIOPError('Action are not supported')
  }
}

const actionObservable = (message) => {
  return Rx.Observable.create(async observer => {
    try {
      const result = await actionBuilder(message.value.content.payload.messageDetails.action)({ payload: message.value.content.payload })
      observer.next(result)
    } catch (err) {
      Logger.info(`action observer failed with error - ${err}`)
      observer.error(err)
    }
  })
}

module.exports = { actionObservable }
