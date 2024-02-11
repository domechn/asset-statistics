const pad = (n: number) => n < 10 ? `0${n}` : '' + n

export const timestampToDate = (timestamp: number, showTime = false) => {
	const date = new Date(timestamp)

	const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
	if (!showTime) {
		return dateStr
	}

	const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
	return `${dateStr} ${timeStr}`
}

export const parseDateToTS = (dateStr: string): number => {
	const [year, month, day] = dateStr.split('-').map(Number)
	return new Date(year, month - 1, day).getTime()
}

export const listAllFirstAndLastDays = (start: Date, end: Date) => {
	const dates = []

	let currentMonth = new Date(start)
	while (currentMonth <= end) {
		const year = currentMonth.getFullYear()
		const month = currentMonth.getMonth()
		const firstDay = new Date(year, month, 1)
		const lastDay = new Date(year, month + 1, 0)

		dates.push({
			firstDay,
			lastDay,
		})

		currentMonth.setMonth(currentMonth.getMonth() + 1)
	}

	return dates
}
