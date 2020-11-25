// Unit Tests for Transaction class
import chai from 'chai'
import * as sinon from 'sinon'

import PaymentProtocol from 'bitcore-payment-protocol'

import Postage from '../src/postage/Postage'
import BITBOXNetwork from '../src/network/BITBOXNetwork'
import mockConfig from './mocks/config.mock.json'
import * as mockData from './mocks/postage.mocks'

describe('#Postage.ts', () => {
    let postage: Postage
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
        postage = new Postage(mockConfig)
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('#getRates', () => {
        it('should return the rate provided by the config', async () => {
            const rate = postage.getRates()

            chai.assert.equal(rate, mockConfig.postageRate)
        })
    })

    describe('#addStampsToTxAndBroadcast', () => {
        it('should add stamps to transaction and broadcast it to the network', async () => {
            const transactionId = '78ffb00ae72702b0a37f7c2e85cc40caca7fde3086637f18d29e4a208e2bbfb5'
            // sandbox.stub(postage.network, 'validateSLPInputs').resolves() as
            //     | Promise<any>
            //     | sinon.SinonStub<[any], Promise<void>>
            // sandbox.stub(postage.network, 'broadcastTransaction').resolves(transactionId) as
            //     | Promise<any>
            //     | sinon.SinonStub<[any], Promise<any>>
            // sandbox.stub(postage.network, 'fetchUTXOsForNumberOfStampsNeeded').resolves(mockData.stampsMock) as
            //     | Promise<any>
            //     | sinon.SinonStub<[number, string], Promise<any>>

            const networkMock = sandbox.createStubInstance(BITBOXNetwork, {
                validateSLPInputs: sandbox.stub().resolves() as Promise<any> | sinon.SinonStub<[any], Promise<void>>,
                broadcastTransaction: sandbox.stub().resolves(transactionId) as
                    | Promise<any>
                    | sinon.SinonStub<[any], Promise<any>>,
                fetchUTXOsForNumberOfStampsNeeded: sandbox.stub().resolves(mockData.stampsMock) as
                    | Promise<any>
                    | sinon.SinonStub<[number, string], Promise<any>>,
            })
            postage.network = networkMock

            const rawIncomingPayment = Buffer.from(
                '12a8020100000001ca6193753fe1e19d89c8785b89bd7bfd0f37efbd0037a27e2126e' +
                    '9fffaa87882030000006a47304402204863028b70ccee19721d6d06489a300be559d4' +
                    '906f3e92c2bdb4b215dd9a4de702201e21f572dfb914f6579388b58275896d5dcc365' +
                    '9164f252bb33a2c6d8ac03897c12103232b147c9483c6e7203b4f8a53c20fade7c12f' +
                    '2791e2e8303b78a5675c0bdad1ffffffff030000000000000000406a04534c5000010' +
                    '10453454e44209fc89d6b7d5be2eac0b3787c5b8236bca5de641b5bafafc8f450727b' +
                    '63615c110800000000479a44bb080000000002625a0022020000000000001976a914a' +
                    '0f531f4ff810a415580c12e54a7072946bb927e88ac220200000000000017a914e8f3' +
                    'b3d3ceea2d7b8750ef400161c6162b3b484b87000000002209556e69742054657374',
                'hex',
            )
            const paymentACKRaw = await postage.addStampsToTxAndBroadcast(rawIncomingPayment)

            const paymentACKBody = PaymentProtocol.PaymentACK.decode(paymentACKRaw)
            const paymentACK = new PaymentProtocol().makePaymentACK(paymentACKBody)
            const paymentBody = PaymentProtocol.Payment.decode(paymentACK.get('payment'))
            const payment = new PaymentProtocol().makePayment(paymentBody)

            chai.assert.equal(payment.get('memo'), 'Unit Test')
            chai.assert.include(paymentACK.get('memo'), transactionId)
        })
    })
    describe('#generateStamps', () => {
        it('should attempt to generate and broadcast new stamps', async () => {
            const transactionId = '78ffb00ae72702b0a37f7c2e85cc40caca7fde3086637f18d29e4a208e2bbfb5'

            const networkMock = sandbox.createStubInstance(BITBOXNetwork, {
                broadcastTransaction: sandbox.stub().resolves(transactionId) as
                    | Promise<any>
                    | sinon.SinonStub<[any], Promise<any>>,
                fetchUTXOsForStampGeneration: sandbox.stub().resolves(mockData.utxoForStampGenerationMock) as
                    | Promise<any>
                    | sinon.SinonStub<[string], Promise<any>>,
            })
            postage.network = networkMock

            await postage.generateStamps()

            chai.assert.equal(networkMock.fetchUTXOsForStampGeneration.calledOnce, true)
            chai.assert.equal(networkMock.broadcastTransaction.calledOnce, true)
        })

        it('should not broadcast anything if server had no balance', async () => {
            const transactionId = '78ffb00ae72702b0a37f7c2e85cc40caca7fde3086637f18d29e4a208e2bbfb5'

            const networkMock = sandbox.createStubInstance(BITBOXNetwork, {
                broadcastTransaction: sandbox.stub().resolves(transactionId) as
                    | Promise<any>
                    | sinon.SinonStub<[any], Promise<any>>,
                fetchUTXOsForStampGeneration: sandbox.stub().resolves([]) as
                    | Promise<any>
                    | sinon.SinonStub<[string], Promise<any>>,
            })
            postage.network = networkMock

            await postage.generateStamps()

            chai.assert.equal(networkMock.broadcastTransaction.called, false)
        })
    })
})
