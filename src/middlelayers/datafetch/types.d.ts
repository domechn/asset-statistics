export type Coin = {
	symbol: string
	amount: number
}

export type WalletCoin = Coin & { wallet: string }

export interface Analyzer {
	getAnalyzeName(): string
	loadPortfolio(): Promise<WalletCoin[]>
}

export type GlobalConfig = CexConfig & TokenConfig & {
	configs: {
		groupUSD: boolean
		querySize: number
		preferCurrency: string
	}
}

export type CexConfig = {
	exchanges: {
		name: string,
		initParams: {
			apiKey: string
			secret: string
			password?: string
		},
		alias?: string
	}[]
}

export type Addresses = {
	addresses?: (string | {
		address: string
		alias?: string
	})[]
}

export type TokenConfig = {
	erc20: Addresses
	btc: Addresses
	sol: Addresses
	doge: Addresses
	others: {
		symbol: string
		amount: number
	}[]
}

export type CoinModel = WalletCoin & {
	value: number
}

export type CoinQueryDetail = {
	model: CoinModel
	date: Date
}

export type CurrencyRate = {
	currency: string
	// rate to usd
	// 1 usd = rate symbol
	rate: number
}