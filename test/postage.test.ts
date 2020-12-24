// Unit Tests for Transaction class
import chai from 'chai'
import * as sinon from 'sinon'

import bitcore from 'bitcore-lib-cash';
import PaymentProtocol from 'bitcore-payment-protocol'

import Postage from '../src/Postage'
import BCHDNetwork from '../src/Network/BCHDNetwork'
import INetUtxo from './../src/Network/INetUtxo';
import * as mockData from './mocks/postage.mocks'

import Config from './mocks/configMock'

// TODO make this non-global
const transactionId = '78ffb00ae72702b0a37f7c2e85cc40caca7fde3086637f18d29e4a208e2bbfb5'

describe('#Postage.ts', () => {
    let postage: Postage
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()

        const bchdNetworkMock = sandbox.createStubInstance(BCHDNetwork, {
            validateSLPInputs: sandbox.stub().resolves() as Promise<any> | sinon.SinonStub<[any], Promise<void>>,
            broadcastTransaction: sandbox.stub().resolves(transactionId) as
                | Promise<string>
                | sinon.SinonStub<[Buffer], Promise<string>>,
            fetchUTXOsForNumberOfStampsNeeded: sandbox.stub().resolves(mockData.stampsMock) as
                | Promise<INetUtxo[]>
                | sinon.SinonStub<[number, bitcore.Address], Promise<INetUtxo[]>>,
        })
        postage = new Postage(Config, bchdNetworkMock)
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('#addStampsToTxAndBroadcast', () => {
        it('should add stamps to transaction and broadcast it to the network', async () => {
            const rawIncomingPayment = Buffer.from(
                '12a8020100000001ca6193753fe1e19d89c8785b89bd7bfd0f37efbd0037a27e2126e9fffaa87882030000006a47304402204863028b70ccee19721d6d06489a300be559d4906f3e92c2bdb4b215dd9a4de702201e21f572dfb914f6579388b58275896d5dcc3659164f252bb33a2c6d8ac03897c12103232b147c9483c6e7203b4f8a53c20fade7c12f2791e2e8303b78a5675c0bdad1ffffffff030000000000000000406a04534c500001010453454e44209fc89d6b7d5be2eac0b3787c5b8236bca5de641b5bafafc8f450727b63615c110800000000479a44bb080000000002625a0022020000000000001976a914a0f531f4ff810a415580c12e54a7072946bb927e88ac220200000000000017a914e8f3b3d3ceea2d7b8750ef400161c6162b3b484b87000000002209556e69742054657374',
                'hex',
            )
            const paymentACKRaw = await postage.addStampsToTxAndBroadcast(rawIncomingPayment)

            const paymentACKBody = PaymentProtocol.PaymentACK.decode(paymentACKRaw)
            const paymentACK = new PaymentProtocol().makePaymentACK(paymentACKBody)
            const paymentBody = PaymentProtocol.Payment.decode(paymentACK.get('payment'))
            const payment = new PaymentProtocol().makePayment(paymentBody)

            chai.assert.equal(payment.get('memo'), 'Unit Test')
        })
    })
    describe('#generateStamps', () => {
        it('should attempt to generate and broadcast new stamps', async () => {
            const networkMock = sandbox.createStubInstance(BCHDNetwork, {
                broadcastTransaction: sandbox.stub().resolves(transactionId) as
                    | Promise<string>
                    | sinon.SinonStub<[Buffer], Promise<string>>,
                fetchUTXOsForStampGeneration: sandbox.stub().resolves(mockData.utxoForStampGenerationMock) as
                    | Promise<INetUtxo[]>
                    | sinon.SinonStub<[bitcore.Address], Promise<INetUtxo[]>>,
            })
            postage.network = networkMock

            await postage.generateStamps()

            chai.assert.equal(networkMock.fetchUTXOsForStampGeneration.calledOnce, true)
            chai.assert.equal(networkMock.broadcastTransaction.calledOnce, true)
        })

        it('should not broadcast anything if server had no balance', async () => {
            const networkMock = sandbox.createStubInstance(BCHDNetwork, {
                broadcastTransaction: sandbox.stub().resolves(transactionId) as
                    | Promise<string>
                    | sinon.SinonStub<[Buffer], Promise<string>>,
                fetchUTXOsForStampGeneration: sandbox.stub().resolves([]) as
                    | Promise<INetUtxo[]>
                    | sinon.SinonStub<[bitcore.Address], Promise<INetUtxo[]>>,
            })
            postage.network = networkMock

            await postage.generateStamps()

            chai.assert.equal(networkMock.broadcastTransaction.called, false)
        })
    })
})
