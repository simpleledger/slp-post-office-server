import HttpClient from './HttpClient'
import IApiWrapper from './IApiWrapper'
import { Log } from './../../log';

export default class BitcoinComSpiceApiWrapper extends HttpClient implements IApiWrapper {
    public constructor() {
        super('https://api.exchange.bitcoin.com/api/2/public/ticker/SPICEBCH')
    }

    public async getPrice(): Promise<number> {
        try {
            const res = await this.instance.get('');
            return res.high;
        } catch(e) {
            Log.error(`Error while trying to get price data from exchange.bitcoin.com: ${e.message}`)
        }
    }
    
}
