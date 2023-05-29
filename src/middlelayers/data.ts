import { invoke } from '@tauri-apps/api'
import bluebird from 'bluebird'
import { CexConfig, Coin, TokenConfig } from './datafetch/types'
import { BTCAnalyzer } from './datafetch/coins/btc'
import { combineCoinLists } from './datafetch/utils/coins'
import { DOGEAnalyzer } from './datafetch/coins/doge'
import { OthersAnalyzer } from './datafetch/coins/others'
import { SOLAnalyzer } from './datafetch/coins/sol'
import { ERC20Analyzer } from './datafetch/coins/erc20'
import { CexAnalyzer } from './datafetch/coins/cex/cex'
import { CacheCenter } from './datafetch/utils/cache'
import { queryHistoricalData } from './charts'
import _ from 'lodash'
import { save, open } from "@tauri-apps/api/dialog"
import { writeTextFile, readTextFile } from "@tauri-apps/api/fs"
import { AssetModel } from './types'
import { getDatabase } from './database'

export async function queryCoinPrices(symbols: string[]): Promise<{ [k: string]: number }> {
	return await invoke("query_coins_prices", { symbols })
}

export async function loadPortfolios(config: CexConfig & TokenConfig): Promise<Coin[]> {

	return loadPortfoliosByConfig(config)
}

async function loadPortfoliosByConfig(config: CexConfig & TokenConfig): Promise<Coin[]> {
	const anas = [ERC20Analyzer, CexAnalyzer, SOLAnalyzer, OthersAnalyzer, BTCAnalyzer, DOGEAnalyzer]
	const coinLists = await bluebird.map(anas, async ana => {

		const a = new ana(config)
		const anaName = a.getAnalyzeName()
		console.log("loading portfolio from ", anaName)
		try {
			const portfolio = await a.loadPortfolio()
			console.log("loaded portfolio from ", anaName)
			return portfolio
		} catch (e) {
			console.error("failed to load portfolio from ", anaName, e)
			throw new Error("failed to load portfolio from " + anaName)
		}

	}, {
		concurrency: anas.length,
	})
	// clean cache after all analyzers finished successfully
	CacheCenter.getInstance().clearCache()
	const assets = combineCoinLists(coinLists)
	return assets
}

export async function exportHistoricalData() {
	const filePath = await save({
		filters: [
			{
				name: "track3-export-data",
				extensions: ["json"],
			},
		],
		defaultPath: "track3-export-data.json",
	})

	if (!filePath) {
		return
	}

	const data = await queryHistoricalData(-1)
	const content = JSON.stringify({
		historicalData: _.map(data, (obj) => _.omit(obj, "id")),
	})

	// save to filePath
	await writeTextFile(filePath, content)
}

export async function importHistoricalData() {
	const selected = await open({
		multiple: false,
		filters: [{

			name: "track3-export-data",
			extensions: ["json"],
		}]
	})
	if (!selected || !_(selected).isString()) {
		return
	}
	const contents = await readTextFile(selected as string)

	const { historicalData: assets } = JSON.parse(contents) as { historicalData: any[] }

	if (!assets || !_(assets).isArray() || assets.length === 0) {
		throw new Error("invalid data: errorCode 001")
	}

	const requiredKeys = ["createdAt", "top01", "amount01", "value01", "top02", "amount02", "value02", "top03", "amount03", "value03", "top04", "amount04", "value04", "top05", "amount05", "value05", "top06", "amount06", "value06", "top07", "amount07", "value07", "top08", "amount08", "value08", "top09", "amount09", "value09", "top10", "amount10", "value10", "topOthers", "amountOthers", "valueOthers", "total"]

	_(assets).forEach((asset) => {
		_(requiredKeys).forEach(k => {
			if (!_(asset).has(k)) {
				throw new Error(`invalid data: errorCode 002`)
			}
		})
	})


	const values = "(" + Object.keys(assets[0]).map(() => '?').join(',') + ")"

	const valuesArrayStr = new Array(assets.length).fill(values).join(',')

	const insertSql = `INSERT INTO assets (${Object.keys(assets[0]).join(',')}) VALUES ${valuesArrayStr}`

	const db = await getDatabase()
	await db.execute(insertSql, _(assets as AssetModel[]).map(a => _(a).values().value()).flatten().value())
}
