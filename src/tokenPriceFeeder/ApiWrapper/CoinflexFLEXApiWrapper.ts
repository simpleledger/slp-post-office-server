import HttpClient from './HttpClient'
import IApiWrapper from './IApiWrapper'
import { AxiosResponse } from 'axios'

export default class CoinFlexFLEXApiWrapper extends HttpClient implements IApiWrapper {
    public constructor() {
        super('https://v2api.coinflex.com/v2/ticker')
    }

    public async getPrice(): Promise<number> {
        try {
            const coinFlexResponse = await this.instance.get('')
            const flexUsdTokenData = coinFlexResponse.filter(item => item.marketCode === 'FLEX-USD').pop()
            return flexUsdTokenData.markPrice
        } catch(e) {
            console.error(`Error while trying to get price data from CoinFlex: ${e.message}`)
        }
    }
    
}
