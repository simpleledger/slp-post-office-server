import INetUtxo from '../../src/Network/INetUtxo';

export const stampMock: INetUtxo[] = [
    {
        tx_hash: '78ffb00ae72702b0a37f7c2e85cc40caca7fde3086637f18d29e4a208e2bbfb5',
        tx_pos: 0,
        value: 546,
        height: 653632,
        script: '76a914d5ed183504707d8bb85f67b5d70102fd09ad0bdb88ac'
    },
    {
        tx_hash: 'd5228d2cdc77fbe5a9aa79f19b0933b6802f9f0067f42847fc4fe343664723e5',
        tx_pos: 0,
        value: 546,
        height: 629922,
        script: '76a914d5ed183504707d8bb85f67b5d70102fd09ad0bdb88ac'
    },
]

export const utxosToSplitMock: INetUtxo[] = [
    {
        tx_hash: '78ffb00ae72702b0a37f7c2e85cc40caca7fde3086637f18d29e4a208e2bbfb5',
        tx_pos: 0,
        value: 2148,
        height: 653632,
        script: '76a914d5ed183504707d8bb85f67b5d70102fd09ad0bdb88ac'
    },

]
