import { Config, PriceFeederConfig } from './../Config';
import { Log } from './../Log';
import BigNumber from 'bignumber.js';
import IApiWrapper from './ApiWrapper/IApiWrapper';

export default class TokenPriceFeeder {
    private priceFeederConfig: PriceFeederConfig;
    private apiWrapper: IApiWrapper;
    private initialStampRate: BigNumber;

    // default is to make stamps cost twice as much as going rate
    // you can apply a custom rule in config to override this
    private _applyDefaultRule(n: BigNumber): BigNumber {
        return new BigNumber(0.00000546).dividedBy(n).times(2);
    }

    public constructor(priceFeederConfig: PriceFeederConfig) {
        this.priceFeederConfig = priceFeederConfig;
        if (! this.priceFeederConfig.tick) {
            this.priceFeederConfig.tick = 100;
        }
        if (! this.priceFeederConfig.useInitialStampRateAsMin) {
            this.priceFeederConfig.useInitialStampRateAsMin = true;
        }
        if (! this.priceFeederConfig.rule) {
            this.priceFeederConfig.rule = this._applyDefaultRule;
        }

        this.apiWrapper = new this.priceFeederConfig.feederClass();

        Config.postageRate.stamps.forEach(stamp => {
            if (stamp.tokenId === this.priceFeederConfig.tokenId) {
                this.initialStampRate = new BigNumber(stamp.rate);
            }
        });
    }

    public async run(): Promise<void> {
        setInterval(async () => {
            const priceData = await this.apiWrapper.getPrice();

            Config.postageRate.stamps.forEach(stamp => {
                if (stamp.tokenId === this.priceFeederConfig.tokenId) {
                    const price: BigNumber = this.priceFeederConfig.rule(priceData);

                    let newStampRate: BigNumber = price.times(10 ** stamp.decimals).integerValue(BigNumber.ROUND_CEIL);
                    if (this.priceFeederConfig.useInitialStampRateAsMin && newStampRate.lt(this.initialStampRate)) {
                        newStampRate = this.initialStampRate;
                    }

                    Log.debug(`${stamp.tokenId} updated rate ${stamp.rate} -> ${newStampRate}`);
                    stamp.rate = newStampRate;  
                }
            });
        }, this.priceFeederConfig.tick * 1000);
    }
}
