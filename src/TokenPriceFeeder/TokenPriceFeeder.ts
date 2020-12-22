import { Config } from './../Config';
import BigNumber from 'bignumber.js';
import IApiWrapper from './ApiWrapper/IApiWrapper';

export default class TokenPriceFeeder {
    private tickInSeconds: number
    private tokenId: string
    private apiWrapper: IApiWrapper
    private useInitialStampRateAsMin: boolean
    private initialStampRate: BigNumber
    private _applyCustomRule: (price: number) => number

    private _applyDefaultRule(price: number): number {
        const minerFeeInUSD = 0.01;
        return price * minerFeeInUSD;
    }

    public constructor(
        tickInSeconds: number,
        tokenId: string,
        apiWrapper: IApiWrapper,
        useInitialStampRateAsMin: boolean = false,
        applyCustomRule?: (price: number) => number
        ) {
            this.tickInSeconds = tickInSeconds;
            this.tokenId = tokenId;
            this.apiWrapper = apiWrapper;
            this._applyCustomRule = applyCustomRule;
            this.useInitialStampRateAsMin = useInitialStampRateAsMin;

            Config.postageRate.stamps.forEach(stamp => {
                if (stamp.tokenId === this.tokenId) {
                    this.initialStampRate = new BigNumber(stamp.rate);
                }
            });

    }

    public async run(): Promise<void> {
        setInterval(async () => {
            const priceData = await this.apiWrapper.getPrice();
            const currentStamps = Config.postageRate.stamps;

            currentStamps.forEach(stamp => {
                if (stamp.tokenId === this.tokenId) {
                    let price: number;
                    if (this._applyCustomRule) {
                        price = this._applyCustomRule(priceData);
                    } else {
                        price = this._applyDefaultRule(priceData);
                    }
                    let newStampRate: BigNumber = new BigNumber(price).times(10 ** stamp.decimals);

                    if (this.useInitialStampRateAsMin) {
                        if (newStampRate.lt(this.initialStampRate)) {
                            newStampRate = this.initialStampRate;
                        }
                    }

                    stamp.rate = newStampRate;  
                }
            });
            
        }, this.tickInSeconds * 1000);
    }
}
