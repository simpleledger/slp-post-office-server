// Unit Tests for Transaction class
import bitcore from 'bitcore-lib-cash'
import chai from 'chai'

import PostageTransaction from '../src/PostageTransaction'
import ErrorMessages from '../src/ErrorMessages'

import * as mockData from './mocks/transaction.mocks'

import Config from './mocks/configMock'

describe('#PostageTransaction.ts', () => {
    let ptx: any = new PostageTransaction(Config)

    beforeEach(() => {
        ptx = new PostageTransaction(Config)
    })

    describe('#addStampsForTransactionAndSignInputs', () => {
        it('should add stamps to the transaction', () => {
            const incomingTransaction = new bitcore.Transaction(
                '010000000101ece1cd3cb5c7097b173c906f3ab3033e0f1065891964ec3bdbd7b0b168c0fb0100000000ffffffff030000000000000000406a04534c500001010453454e44209fc89d6b7d5be2eac0b3787c5b8236bca5de641b5bafafc8f450727b63615c110800000000479a44bb080000000002625a0022020000000000001976a914a0f531f4ff810a415580c12e54a7072946bb927e88ac220200000000000017a914e8f3b3d3ceea2d7b8750ef400161c6162b3b484b8700000000'
            )
            chai.assert.equal(incomingTransaction.inputs.length, 1)

            const resultTransaction = ptx.addStampsForTransaction(
                incomingTransaction,
                mockData.stampMock,
                true
            )
            chai.assert.equal(resultTransaction.inputs.length, 3)
        })
    })

    describe('#getNeededStamps', () => {
        it('should raise INVALID_SLP_OP_RETURN on providing invalid LOKAD_ID', () => {
            try {
                const transactionMockWithinvalidLokadIdOPReturn = {
                    outputs: [
                        {
                            script: bitcore.Script.fromHex(
                                '6a0001010453454e44209fc89d6b7d5be2eac0b3787c5b8236bca5de641b5bafafc8f450727b63615c110800000000479a44bb080000000002625a00',
                            ),
                        },
                    ],
                }
                ptx.getNeededStamps(transactionMockWithinvalidLokadIdOPReturn)
                chai.assert.equal(true, false, 'Test failed. Unexpected result!')
            } catch (err) {
                chai.assert.equal(err.message, ErrorMessages.INVALID_SLP_OP_RETURN)
            }
        })

        it('should raise an error if no payment was provided to the server', () => {
            try {
                const transactionMockWithNoPaymentToServer = new bitcore.Transaction(
                    '010000000101ece1cd3cb5c7097b173c906f3ab3033e0f1065891964ec3bdbd7b0b168c0fb0100000000ffffffff020000000000000000376a04534c500001010453454e44209fc89d6b7d5be2eac0b3787c5b8236bca5de641b5bafafc8f450727b63615c110800000000479a44bb22020000000000001976a914a0f531f4ff810a415580c12e54a7072946bb927e88ac00000000'
                )

                ptx.getNeededStamps(transactionMockWithNoPaymentToServer)
                chai.assert.equal(true, false, 'Test failed. Unexpected result!')
            } catch (err) {
                chai.assert.equal(err.message, ErrorMessages.INSUFFICIENT_POSTAGE)
            }
        })
        it('should raise an error if the transaction uses a token that is not supported by the server', () => {
            try {
                const transactionMockWithUnsupportedToken = new bitcore.Transaction(
                    '010000000101ece1cd3cb5c7097b173c906f3ab3033e0f1065891964ec3bdbd7b0b168c0fb0100000000ffffffff030000000000000000326a04534c50000101204de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf0800000000479a44bb22020000000000001976a914a0f531f4ff810a415580c12e54a7072946bb927e88ac220200000000000017a914e8f3b3d3ceea2d7b8750ef400161c6162b3b484b8700000000',
                )

                ptx.getNeededStamps(transactionMockWithUnsupportedToken)
                chai.assert.equal(true, false, 'Test failed. Unexpected result!')
            } catch (err) {
                chai.assert.equal(err.message, ErrorMessages.UNSUPPORTED_SLP_TOKEN)
            }
        })
        it('should return number of stamps required for the transaction', () => {
            const validMockTransaction = new bitcore.Transaction(
                '010000000101ece1cd3cb5c7097b173c906f3ab3033e0f1065891964ec3bdbd7b0b168c0fb0100000000ffffffff030000000000000000406a04534c500001010453454e44209fc89d6b7d5be2eac0b3787c5b8236bca5de641b5bafafc8f450727b63615c110800000000479a44bb080000000002625a0022020000000000001976a914a0f531f4ff810a415580c12e54a7072946bb927e88ac220200000000000017a914e8f3b3d3ceea2d7b8750ef400161c6162b3b484b8700000000',
            )

            const neededStamps = ptx.getNeededStamps(validMockTransaction)
            chai.assert.equal(neededStamps, 40000000)
        })
    })

    describe('#splitUtxosIntoStamps', () => {
        it('should generate a transaction spliting utxos to dust amount utxos', async () => {
            const hdNode = {privateKey: bitcore.PrivateKey.fromWIF('L1XPxGFKXjYrC3mT91Sqr9bXLemepHHPGif1duu9BzaDZZ7P8Mq3')}

            // mockData.utxosToSplitMock contains 2148 sat, should split into 3 stamps
            const tx = ptx.splitUtxosIntoStamps(mockData.utxosToSplitMock);
            const generatedTransaction = new bitcore.Transaction(tx);

            chai.assert.equal(generatedTransaction.outputs.length, 3)
        })
    })
})
