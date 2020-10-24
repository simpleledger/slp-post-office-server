// Unit Tests for Transaction class
import chai from 'chai'
import sinon from 'sinon'

import Network from '../src/network/Network'
import errorMessages from '../src/errorMessages'
import * as mockData from './mocks/network.mocks'
import mockConfig from './mocks/config.mock.json'

describe('#Transaction.ts', () => {
    let network: any
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        network = new Network(mockConfig)
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('#fetchUTXOsForStampGeneration', () => {
        it('should return utxos to split', async () => {
            sandbox.stub(network.bchjs.Electrumx, 'utxo').resolves(mockData.utxosToSplitMock)

            const utxosToSplit = await network.fetchUTXOsForStampGeneration('')
            chai.assert.equal(utxosToSplit.length, 2)
        })

        it('should raise an error if address balance was not enough to generate new stamps', async () => {
            sandbox.stub(network.bchjs.Electrumx, 'utxo').resolves(mockData.dustUtxo)
            try {
                await network.fetchUTXOsForStampGeneration('')
                chai.assert.equal(true, false, 'Test failed. Unexpected result!')
            } catch (err) {
                chai.assert.equal(err.message, 'Insufficient Balance for Stamp Generation')
            }
        })
    })

    describe('#fetchUTXOsForNumberOfStampsNeeded', () => {
        it('should raise an UNAVAILABLE_STAMPS error if amount of stamps available was less than stamps needed.', async () => {
            try {
                sandbox.stub(network.bchjs.Electrumx, 'utxo').resolves(mockData.utxosToSplitMock)
                sandbox.stub(network.bchjs.SLP.Utils, 'validateTxid').resolves([])

                await network.fetchUTXOsForNumberOfStampsNeeded(3, '')
                chai.assert.equal(true, false, 'Test failed. Unexpected result!')
            } catch (err) {
                chai.assert.equal(err.message, errorMessages.UNAVAILABLE_STAMPS)
            }
        })

        it('should return a list of requested stamps', async () => {
            sandbox.stub(network.bchjs.Electrumx, 'utxo').resolves(mockData.utxosToSplitMock)
            sandbox.stub(network.bchjs.SLP.Utils, 'validateTxid').resolves(mockData.nonSLPTxIdsResultOfValidateTxId)

            const numberOfStampsNeeded = 2
            const stamps = await network.fetchUTXOsForNumberOfStampsNeeded(numberOfStampsNeeded, '')
            chai.assert.equal(stamps.length, numberOfStampsNeeded)
        })
    })

    describe('#validateSLPInputs', () => {
        it('should raise a INVALID_PAYMENT error if at least one of the inputs were invalid', async () => {
            try {
                sandbox.stub(network.bchjs.SLP.Utils, 'validateTxid').resolves(mockData.nonSLPTxIdsResultOfValidateTxId)

                await network.validateSLPInputs([])
                chai.assert.equal(true, false, 'Test failed. Unexpected result!')
            } catch (err) {
                chai.assert.equal(err.message, errorMessages.INVALID_PAYMENT)
            }
        })

        it('should run without an error if all inputs are valid SLP inputs', async () => {
            try {
                sandbox.stub(network.bchjs.SLP.Utils, 'validateTxid').resolves(mockData.SLPTxIdsResultOfValidateTxId)

                const stamps = await network.validateSLPInputs([])
            } catch (err) {
                console.log(err.message)
                chai.assert.equal(true, false, 'Test failed. Unexpected result!')
            }
        })
    })

    describe('#broadcastTransaction', () => {
        it('should run without an error if all inputs are valid SLP inputs', async () => {
            try {
                const transactionId = '78ffb00ae72702b0a37f7c2e85cc40caca7fde3086637f18d29e4a208e2bbfb5'
                sandbox.stub(network.bchjs.RawTransactions, 'sendRawTransaction').resolves(transactionId)

                const resolvedTransactionId = await network.broadcastTransaction('')
                chai.assert.equal(resolvedTransactionId, transactionId)
            } catch (err) {
                console.log(err.message)
                chai.assert.equal(true, false, 'Test failed. Unexpected result!')
            }
        })
    })
})
