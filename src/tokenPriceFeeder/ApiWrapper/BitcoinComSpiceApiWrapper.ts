import HttpClient from './HttpClient'
import IApiWrapper from './IApiWrapper'
import { AxiosResponse } from 'axios'
import { log } from './../../logger';

export default class BitcoinComSpiceApiWrapper extends HttpClient implements IApiWrapper {
    public constructor() {
        super('https://api.exchange.bitcoin.com/api/2/public/ticker/SPICEBCH')
    }

    public async getPrice(): Promise<number> {
        try {
            const res = await this.instance.get('');
            return res.high;
        } catch(e) {
            log.error(`Error while trying to get price data from exchange.bitcoin.com: ${e.message}`)
        }
    }
    
}
