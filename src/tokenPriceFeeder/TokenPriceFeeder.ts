import IApiWrapper from './ApiWrapper/IApiWrapper'

export default class TokenPriceFeeder {
    private config: any
    private tickInSeconds: number
    private tokenId: string
    private apiWrapper: IApiWrapper
    private _applyCustomRule: (price: number) => number

    private _applyDefaultRule(price: number): number {
        const minerFeeInUSD = 0.01
        return price * minerFeeInUSD
    }

    public constructor(config: any, tickInSeconds: number,tokenId: string, apiWrapper: IApiWrapper, applyCustomRule: (price: number) => number) {
        this.config = config
        this.tickInSeconds = tickInSeconds
        this.tokenId = tokenId
        this.apiWrapper = apiWrapper
        this._applyCustomRule = applyCustomRule
    }

    public async run() {
        setInterval(async () => {
            const priceData = await this.apiWrapper.getPrice()
            const currentStamps = this.config.postageRate.stamps
            currentStamps.forEach(stamp => {
                if (stamp.tokenId === this.tokenId) {
                    let price: number
                    if (this._applyCustomRule) {
                        price = this._applyCustomRule(priceData)
                    } else {
                        price = this._applyDefaultRule(priceData)
                    }
                    stamp.rate = new BigNumber(price).times(10 ** stamp.decimals)
                    
                }
            });
            
        }, this.tickInSeconds * 1000)
    }
}