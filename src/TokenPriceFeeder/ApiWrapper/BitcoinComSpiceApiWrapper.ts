import BigNumber from 'bignumber.js';
import HttpClient from './HttpClient';
import IApiWrapper from './IApiWrapper';
import { Log } from './../../Log';

export default class BitcoinComSpiceApiWrapper extends HttpClient implements IApiWrapper {
    public constructor() {
        super('https://api.exchange.bitcoin.com/api/2/public/ticker/SPICEBCH');
    }

    // This returns price in BCH so we can return the value directly
    public async getPrice(): Promise<BigNumber> {
        try {
            const res = await this.instance.get('');
            return new BigNumber(res.high);
        } catch(e) {
            Log.error(`Error while trying to get price data from exchange.bitcoin.com: ${e.message}`);
        }
    }
    
}
