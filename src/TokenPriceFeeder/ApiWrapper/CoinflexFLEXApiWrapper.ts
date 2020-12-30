import BigNumber from 'bignumber.js';
import HttpClient from './HttpClient';
import IApiWrapper from './IApiWrapper';
import { Log } from './../../Log';

export default class CoinFlexFLEXApiWrapper extends HttpClient implements IApiWrapper {
    public constructor() {
        super('https://v2api.coinflex.com/v2/ticker');
    }

    // This returns price in USD so we need to divide by the BCH price to get price in BCH
    public async getPrice(): Promise<BigNumber> {
        try {
            const res = await this.instance.get('');
            const flexUsd = new BigNumber(res.filter(o => o.marketCode === 'FLEX-USD').pop().markPrice);
            const bchUsd = new BigNumber(res.filter(o => o.marketCode === 'BCH-USD').pop().markPrice);
            return flexUsd.dividedBy(bchUsd);
        } catch(e) {
            Log.error(`Error while trying to get price data from CoinFlex: ${e.message}`);
        }
    }
    
}
