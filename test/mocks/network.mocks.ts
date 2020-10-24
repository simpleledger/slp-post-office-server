export const utxosToSplitMock: any = { 
    utxos: [
        {
            tx_hash: '78ffb00ae72702b0a37f7c2e85cc40caca7fde3086637f18d29e4a208e2bbfb5',
            tx_pos: 0,
            value: 5000,
            height: 653632,
        },
        {
            tx_hash: 'd5228d2cdc77fbe5a9aa79f19b0933b6802f9f0067f42847fc4fe343664723e5',
            tx_pos: 0,
            value: 6000,
            height: 629922,
        },
    ],
}

export const nonSLPTxIdsResultOfValidateTxId: any = [
    {
        txid: '78ffb00ae72702b0a37f7c2e85cc40caca7fde3086637f18d29e4a208e2bbfb5',
        valid: false,
    },
    {
        txid: 'd5228d2cdc77fbe5a9aa79f19b0933b6802f9f0067f42847fc4fe343664723e5',
        valid: false,
    },
]

export const SLPTxIdsResultOfValidateTxId: any = [
    {
        txid: '78ffb00ae72702b0a37f7c2e85cc40caca7fde3086637f18d29e4a208e2bbfb5',
        valid: true,
    },
    {
        txid: 'd5228d2cdc77fbe5a9aa79f19b0933b6802f9f0067f42847fc4fe343664723e5',
        valid: true,
    },
]

export const dustUtxo: any = {
    utxos: [
        {
            tx_hash: '78ffb00ae72702b0a37f7c2e85cc40caca7fde3086637f18d29e4a208e2bbfb5',
            tx_pos: 0,
            value: 546,
            height: 653632,
        },
    ],
}
