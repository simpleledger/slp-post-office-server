import BigNumber from 'bignumber.js';
import HttpClient from './HttpClient';
import IApiWrapper from './IApiWrapper';
import { Log } from './../../Log';

export default class CoinexUSDTApiWrapper extends HttpClient implements IApiWrapper {
    public constructor() {
        super('https://api.coinex.com/v1/market/ticker?market=bchusdt');
    }

    // This returns price in USDT so we need to divide 1 by the USDT price to get price in BCH
    public async getPrice(): Promise<BigNumber> {
        try {
            const res = await this.instance.get('');
            return new BigNumber(1).dividedBy(res.data.ticker.high);
        } catch(e) {
            Log.error(`Error while trying to get price data from api.coinex.com: ${e.message}`);
        }
    }
    
}
