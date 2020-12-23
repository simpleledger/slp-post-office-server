import BigNumber from 'bignumber.js';
import HttpClient from './HttpClient';
import IApiWrapper from './IApiWrapper';
import { Log } from './../../Log';

export default class CoinexUSDTApiWrapper extends HttpClient implements IApiWrapper {
    public constructor() {
        super('https://api.coinex.com/v1/market/ticker?market=bchusdt');
    }

    public async getPrice(): Promise<BigNumber> {
        try {
            const res = await this.instance.get('');
            return new BigNumber(res.data.ticker.high);
        } catch(e) {
            Log.error(`Error while trying to get price data from api.coinex.com: ${e.message}`);
        }
    }
    
}
