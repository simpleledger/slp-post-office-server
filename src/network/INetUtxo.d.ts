export default interface INetUtxo {
    tx_hash: string;
    tx_pos: number;
    value: number;
    height: number;
    script: string;
}
