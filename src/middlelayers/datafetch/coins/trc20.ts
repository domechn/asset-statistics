import { Analyzer, TokenConfig, WalletCoin } from '../types'
import _ from 'lodash'
import { sendHttpRequest } from '../utils/http'
import { getAddressList } from '../utils/address'
import { getLicenseIfIsPro } from '@/middlelayers/configuration'
import { getClientID } from '@/utils/app'
import { asyncMap } from '../utils/async'

export class TRC20ProUserAnalyzer implements Analyzer {
	private readonly config: Pick<TokenConfig, 'trc20'>
	private readonly queryUrl = "https://track3-pro-api.domc.me/api/trc20/assetsBalances"

	constructor(config: Pick<TokenConfig, 'trc20'>) {
		this.config = config
	}

	getAnalyzeName(): string {
		return "TRC20 Analyzer"
	}

	async preLoad(): Promise<void> {
	}

	async postLoad(): Promise<void> {
	}

	// only pro user
	async verifyConfigs(): Promise<boolean> {
		const regex = /^(T|TLa|TM)[1-9A-HJ-NP-Za-km-z]{33}$/

		const valid = _(getAddressList(this.config.trc20)).every((address) => regex.test(address))
		return valid
	}

	async loadPortfolio(): Promise<WalletCoin[]> {
		const license = await getLicenseIfIsPro()
		// it should not happened, raise error
		if (!license) {
			throw new Error("unexpected error: no pro license")
		}
		return this.loadPortfolioWithRetry(license, 5)
	}

	async loadPortfolioWithRetry(license: string, max: number): Promise<WalletCoin[]> {
		try {
			if (max <= 0) {
				throw new Error("failed to query trc20 assets")
			}
			const coins = await this.loadPortfolioInternal(license)
			return coins
		} catch (e) {
			if (e instanceof Error && (e.message.includes("504") || e.message.includes("503"))) {
				console.error("failed to query pro trc20 assets, retrying...")
				// sleep 2s
				await new Promise(resolve => setTimeout(resolve, 2000))

				return this.loadPortfolioWithRetry(license, max - 1)
			} else {
				throw e
			}
		}
	}

	async loadPortfolioInternal(license: string): Promise<WalletCoin[]> {
		const resp = await asyncMap([getAddressList(this.config.trc20)], async wallets => sendHttpRequest<{
			data: {
				wallet: string
				assets: {
					symbol: string
					amount: number
					tokenAddress: string
					// based on usd
					price?: number
				}[]
			}[]
		}>("POST", this.queryUrl, 20000, {
			"x-track3-client-id": await getClientID(),
			'x-track3-api-key': license
		}, {
			wallets,
		}), 1, 1000)

		return _(resp[0].data).map(d => _(d.assets).map(a => ({
			symbol: a.symbol,
			amount: a.amount,
			price: a.price ? {
				value: a.price,
				base: "usd"
			} : undefined,
			wallet: d.wallet
		} as WalletCoin)).value()).flatten().value()
	}
}