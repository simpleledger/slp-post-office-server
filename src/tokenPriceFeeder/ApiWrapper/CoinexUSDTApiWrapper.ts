import HttpClient from './HttpClient'
import IApiWrapper from './IApiWrapper'
import { AxiosResponse } from 'axios'

export default class CoinexUSDTApiWrapper extends HttpClient implements IApiWrapper {
    public constructor() {
        super('https://api.coinex.com/v1/market/ticker?market=bchusdt')
    }

    public async getPrice(): Promise<number> {
        try {
            const res = await this.instance.get('');
            return Number(res.data.ticker.high);
        } catch(e) {
            console.error(`Error while trying to get price data from api.coinex.com: ${e.message}`)
        }
    }
    
}
