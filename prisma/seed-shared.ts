import {
	type PrismaClient,
	type ColorGroup,
	type Level,
	type TournamentFormat,
} from '@prisma/client'
import { loadPlayoffQualificationContext } from '../app/lib/playoff-qualification.server'

export type SeedTournamentConfig = {
	format: TournamentFormat
	name: string
	year: number
	groupColors: ColorGroup[]
	getTeamsPerGroup: (color: ColorGroup) => number
}

export const FOUR_GROUPS_SEED_CONFIG: SeedTournamentConfig = {
	format: 'four_groups',
	name: 'Longara 3vs3 2026 (4 gironi)',
	year: 2026,
	groupColors: ['red', 'blue', 'green', 'yellow'],
	getTeamsPerGroup: () => 7,
}

export const FIVE_GROUPS_SEED_CONFIG: SeedTournamentConfig = {
	format: 'five_groups',
	name: 'Longara 3vs3 2025',
	year: 2025,
	groupColors: ['red', 'blue', 'green', 'yellow', 'purple'],
	getTeamsPerGroup: (color) => (color === 'red' || color === 'blue' ? 7 : 6),
}

const nomiSquadre = [
	'Dragons',
	'Phoenix',
	'Tigers',
	'Lions',
	'Eagles',
	'Hawks',
	'Bulls',
	'Wolves',
	'Panthers',
	'Bears',
	'Sharks',
	'Cobras',
	'Vipers',
	'Ravens',
	'Falcons',
	'Knights',
	'Warriors',
	'Titans',
	'Giants',
	'Spartans',
	'Gladiators',
	'Legends',
	'Thunder',
	'Lightning',
	'Storm',
	'Fire',
	'Ice',
	'Wind',
	'Stars',
	'Rockets',
	'Pandas',
	'Pellicans',
	'Dolphins',
] as const

const nomi = [
	'Marco',
	'Luca',
	'Giovanni',
	'Andrea',
	'Alessandro',
	'Francesco',
	'Lorenzo',
	'Matteo',
	'Gabriele',
	'Davide',
	'Giuseppe',
	'Antonio',
	'Simone',
	'Federico',
	'Roberto',
	'Paolo',
	'Carlo',
	'Stefano',
	'Enrico',
	'Nicola',
	'Massimo',
	'Luigi',
	'Giorgio',
	'Alberto',
	'Michele',
	'Filippo',
	'Salvatore',
	'Riccardo',
	'Daniele',
	'Vincenzo',
] as const

const cognomi = [
	'Rossi',
	'Ferrari',
	'Russo',
	'Bianchi',
	'Romano',
	'Gallo',
	'Costa',
	'Fontana',
	'Conti',
	'Esposito',
	'Ricci',
	'Bruno',
	'De Luca',
	'Moretti',
	'Marino',
	'Greco',
	'Barbieri',
	'Lombardi',
	'Giordano',
	'Colombo',
	'Mancini',
	'Longo',
	'Leone',
	'Martinelli',
	'Serra',
	'Santoro',
	'Mariani',
	'Rinaldi',
	'Caruso',
	'Ferrara',
] as const

const livelli: Level[] = [
	'serie_b',
	'serie_c',
	'serie_d',
	'prima_divisione',
	'promozione',
	'u15',
	'u17',
	'u19',
	'u20',
	'over',
	'mai_giocato',
	'free_agent',
	'csi',
	'campetto',
]

function getRandomElement<T extends readonly unknown[]>(array: T): T[number] {
	if (array.length === 0) throw new Error('Array vuoto')
	return array[Math.floor(Math.random() * array.length)]
}

function getRandomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRandomPlayer() {
	return {
		name: getRandomElement(nomi),
		surname: getRandomElement(cognomi),
		birthYear: getRandomInt(1985, 2005),
		level: getRandomElement(livelli),
		paid: true,
		totalPoints: 0,
		warnings: 0,
		isExpelled: false,
		retired: false,
	}
}

function generateRandomTeam() {
	return {
		name: getRandomElement(nomiSquadre),
	}
}

function generateTimeSlots() {
	const timeSlots: string[] = []
	let hour = 18
	let minute = 0

	while (hour < 22 || (hour === 22 && minute <= 35)) {
		const start = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
		minute += 15
		if (minute >= 60) {
			minute = 0
			hour++
		}
		const end = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
		timeSlots.push(`${start} > ${end}`)
		minute += 5
		if (minute >= 60) {
			minute = 0
			hour++
		}
	}

	return timeSlots
}

function calcolaSlotDisponibili(
	allTimeSlots: string[],
	giorno: number,
): number {
	const slots = allTimeSlots.filter((slot) => {
		const [startTime] = slot.split(' > ')
		if (!startTime) return false
		const [hours] = startTime.split(':')
		if (!hours) return false
		const hour = parseInt(hours, 10)
		if (giorno === 1) return true
		return hour >= 19
	})
	return slots.length * 2
}

function verificaDisponibilitaSlot(
	gruppo: { name: string; teams: { id: string }[] },
	allTimeSlots: string[],
	giorni: number[],
): boolean {
	const numeroSquadre = gruppo.teams.length
	const partiteTotali = (numeroSquadre * (numeroSquadre - 1)) / 2

	console.log(`\nAnalisi slot per ${gruppo.name} (${numeroSquadre} squadre):`)
	console.log(`Totale partite nel girone: ${partiteTotali}`)

	let slotTotaliDisponibili = 0
	for (const giorno of giorni) {
		slotTotaliDisponibili += calcolaSlotDisponibili(allTimeSlots, giorno)
	}

	console.log(`- Slot totali disponibili: ${slotTotaliDisponibili}`)
	console.log(`- Slot necessari: ${partiteTotali}`)

	return slotTotaliDisponibili >= partiteTotali
}

function distributePoints(totalPoints: number, numPlayers: number): number[] {
	const points = new Array(numPlayers).fill(0)
	let remainingPoints = totalPoints
	const minPoints = Math.min(2, Math.floor(totalPoints / numPlayers))
	points.forEach((_, index) => {
		points[index] = minPoints
		remainingPoints -= minPoints
	})
	while (remainingPoints > 0) {
		const playerIndex = Math.floor(Math.random() * numPlayers)
		const pointsToAdd = Math.min(remainingPoints, getRandomInt(1, 3))
		points[playerIndex] += pointsToAdd
		remainingPoints -= pointsToAdd
	}
	return points
}

async function generateMatchScores(
	match: { id: string; team1Id: string; team2Id: string },
	prisma: PrismaClient,
): Promise<{ winnerId: string; loserId: string }> {
	let score1: number
	let score2: number
	do {
		score1 = getRandomInt(7, 21)
		score2 = getRandomInt(7, 21)
	} while (score1 === score2)

	const winner = score1 > score2 ? match.team1Id : match.team2Id
	const team1Players = await prisma.player.findMany({
		where: { teamId: match.team1Id },
	})
	const team2Players = await prisma.player.findMany({
		where: { teamId: match.team2Id },
	})

	if (team1Players.length === 0 || team2Players.length === 0) {
		throw new Error(`Squadra non trovata per la partita ${match.id}`)
	}

	const team1Points = distributePoints(score1, team1Players.length)
	const team2Points = distributePoints(score2, team2Players.length)

	for (let i = 0; i < team1Players.length; i++) {
		const player = team1Players[i]
		if (!player) continue
		await prisma.playerMatchStats.create({
			data: { matchId: match.id, playerId: player.id, points: team1Points[i] },
		})
		await prisma.player.update({
			where: { id: player.id },
			data: { totalPoints: { increment: team1Points[i] } },
		})
	}

	for (let i = 0; i < team2Players.length; i++) {
		const player = team2Players[i]
		if (!player) continue
		await prisma.playerMatchStats.create({
			data: { matchId: match.id, playerId: player.id, points: team2Points[i] },
		})
		await prisma.player.update({
			where: { id: player.id },
			data: { totalPoints: { increment: team2Points[i] } },
		})
	}

	await prisma.match.update({
		where: { id: match.id },
		data: { score1, score2, winner },
	})

	return {
		winnerId: winner,
		loserId: winner === match.team1Id ? match.team2Id : match.team1Id,
	}
}

async function createAndScoreMatch(
	prisma: PrismaClient,
	data: {
		playgroundId: string
		day: number
		timeSlot: string
		field: string
		team1Id: string
		team2Id: string
	},
) {
	const match = await prisma.match.create({ data })
	return generateMatchScores(match, prisma)
}

export async function resetDatabase(prisma: PrismaClient) {
	await prisma.playerMatchStats.deleteMany()
	await prisma.threePointChallengeParticipant.deleteMany()
	await prisma.match.deleteMany()
	await prisma.player.deleteMany()
	await prisma.team.deleteMany()
	await prisma.group.deleteMany()
	await prisma.jerseyStock.deleteMany()
	await prisma.playground.deleteMany()
}

async function scheduleGroupMatches(
	prisma: PrismaClient,
	playgroundId: string,
	gruppi: Array<{ id: string; name: string }>,
) {
	const allTimeSlots = generateTimeSlots()
	const fields = ['A', 'B'] as const
	const giorni = [1, 2, 3, 4]

	for (const gruppo of gruppi) {
		const teams = await prisma.team.findMany({
			where: { groupId: gruppo.id },
		})

		const gruppoConTeams = { ...gruppo, teams }
		if (!verificaDisponibilitaSlot(gruppoConTeams, allTimeSlots, giorni)) {
			throw new Error(
				`Non ci sono abbastanza slot disponibili per il girone ${gruppo.name}`,
			)
		}

		const partite: Array<[string, string]> = []
		for (let i = 0; i < teams.length; i++) {
			const team1 = teams[i]
			if (!team1) continue
			for (let j = i + 1; j < teams.length; j++) {
				const team2 = teams[j]
				if (!team2) continue
				partite.push([team1.id, team2.id])
			}
		}

		const partiteAttese = (teams.length * (teams.length - 1)) / 2
		if (partite.length !== partiteAttese) {
			throw new Error(
				`Numero di partite errato per il girone ${gruppo.name}. Attese: ${partiteAttese}, Generate: ${partite.length}`,
			)
		}

		const partitePerGiorno = Math.ceil(partite.length / giorni.length)
		let partitaIndex = 0

		for (const giorno of giorni) {
			const partiteDelGiorno = partite.slice(
				partitaIndex,
				partitaIndex + partitePerGiorno,
			)
			const squadreGiocateOggi = new Set<string>()
			const partitePerFascia = new Map<string, Set<string>>()

			const timeSlots = allTimeSlots.filter((slot) => {
				const [startTime] = slot.split(' > ')
				if (!startTime) return false
				const [hours] = startTime.split(':')
				if (!hours) return false
				const hour = parseInt(hours, 10)
				if (giorno === 1) return true
				return hour >= 19
			})

			timeSlots.forEach((slot) => {
				partitePerFascia.set(slot, new Set<string>())
			})

			for (const [team1Id, team2Id] of partiteDelGiorno) {
				let fasciaAssegnata = false
				for (const timeSlot of timeSlots) {
					const fasciaCorrente = partitePerFascia.get(timeSlot)
					if (!fasciaCorrente) continue
					if (fasciaCorrente.has(team1Id) || fasciaCorrente.has(team2Id))
						continue
					if (
						squadreGiocateOggi.has(team1Id) &&
						squadreGiocateOggi.size > teams.length * 2
					)
						continue
					if (
						squadreGiocateOggi.has(team2Id) &&
						squadreGiocateOggi.size > teams.length * 2
					)
						continue

					for (const field of fields) {
						const partitaEsistente = await prisma.match.findFirst({
							where: {
								day: giorno,
								timeSlot,
								field,
								playgroundId,
							},
						})

						if (!partitaEsistente) {
							await prisma.match.create({
								data: {
									playgroundId,
									day: giorno,
									timeSlot,
									field,
									team1Id,
									team2Id,
								},
							})
							fasciaCorrente.add(team1Id)
							fasciaCorrente.add(team2Id)
							squadreGiocateOggi.add(team1Id)
							squadreGiocateOggi.add(team2Id)
							fasciaAssegnata = true
							break
						}
					}
					if (fasciaAssegnata) break
				}
			}

			partitaIndex += partitePerGiorno
		}
	}
}

async function simulatePlayinAndPlayoffs(
	prisma: PrismaClient,
	playgroundId: string,
) {
	const { directPlayoffTeams, playinTeams } =
		await loadPlayoffQualificationContext(prisma, playgroundId)

	if (directPlayoffTeams.length !== 8 || playinTeams.length !== 16) {
		throw new Error(
			`Qualificazione non valida: dirette=${directPlayoffTeams.length}, playin=${playinTeams.length}`,
		)
	}

	const playinTimeSlots = [
		'18:00 > 18:15',
		'18:20 > 18:35',
		'18:40 > 18:55',
		'19:00 > 19:15',
	]
	const playinWinners: string[] = []

	for (let i = 0; i < 8; i++) {
		const team1 = playinTeams[i]
		const team2 = playinTeams[playinTeams.length - 1 - i]
		const slot = playinTimeSlots[Math.floor(i / 2)]
		const field = i % 2 === 0 ? 'A' : 'B'

		if (!team1 || !team2 || !slot) {
			throw new Error('Dati insufficienti per creare il tabellone play-in')
		}

		const result = await createAndScoreMatch(prisma, {
			playgroundId,
			day: 5,
			timeSlot: slot,
			field,
			team1Id: team1.id,
			team2Id: team2.id,
		})

		playinWinners.push(result.winnerId)
	}

	const seededTeams = [
		...directPlayoffTeams.map((team) => team.id),
		...playinWinners,
	]
	if (seededTeams.length !== 16) {
		throw new Error(
			`Tabellone playoff incompleto: ${seededTeams.length} squadre`,
		)
	}

	const finalEightSlots = [
		'19:20 > 19:35',
		'19:40 > 19:55',
		'20:00 > 20:15',
		'20:20 > 20:35',
	]
	const finalFourSlots = ['20:40 > 20:55', '21:00 > 21:15']
	const semifinalSlot = '21:20 > 21:35'
	const thirdPlaceSlot = '21:40 > 21:55'
	const finalSlot = '22:00 > 22:15'

	const roundOf16Winners: string[] = []
	for (let i = 0; i < 8; i++) {
		const team1Id = seededTeams[i]
		const team2Id = seededTeams[seededTeams.length - 1 - i]
		const slot = finalEightSlots[Math.floor(i / 2)]
		const field = i % 2 === 0 ? 'A' : 'B'

		if (!team1Id || !team2Id || !slot) {
			throw new Error('Errore creazione ottavi')
		}

		const result = await createAndScoreMatch(prisma, {
			playgroundId,
			day: 7,
			timeSlot: slot,
			field,
			team1Id,
			team2Id,
		})

		roundOf16Winners.push(result.winnerId)
	}

	const quarterWinners: string[] = []
	for (let i = 0; i < 4; i++) {
		const team1Id = roundOf16Winners[i * 2]
		const team2Id = roundOf16Winners[i * 2 + 1]
		const slot = finalFourSlots[Math.floor(i / 2)]
		const field = i % 2 === 0 ? 'A' : 'B'

		if (!team1Id || !team2Id || !slot) {
			throw new Error('Errore creazione quarti')
		}

		const result = await createAndScoreMatch(prisma, {
			playgroundId,
			day: 7,
			timeSlot: slot,
			field,
			team1Id,
			team2Id,
		})

		quarterWinners.push(result.winnerId)
	}

	const semifinalWinners: string[] = []
	const semifinalLosers: string[] = []
	for (let i = 0; i < 2; i++) {
		const team1Id = quarterWinners[i * 2]
		const team2Id = quarterWinners[i * 2 + 1]
		const field = i === 0 ? 'A' : 'B'

		if (!team1Id || !team2Id) {
			throw new Error('Errore creazione semifinali')
		}

		const result = await createAndScoreMatch(prisma, {
			playgroundId,
			day: 7,
			timeSlot: semifinalSlot,
			field,
			team1Id,
			team2Id,
		})

		semifinalWinners.push(result.winnerId)
		semifinalLosers.push(result.loserId)
	}

	await createAndScoreMatch(prisma, {
		playgroundId,
		day: 7,
		timeSlot: thirdPlaceSlot,
		field: 'A',
		team1Id: semifinalLosers[0]!,
		team2Id: semifinalLosers[1]!,
	})

	await createAndScoreMatch(prisma, {
		playgroundId,
		day: 7,
		timeSlot: finalSlot,
		field: 'A',
		team1Id: semifinalWinners[0]!,
		team2Id: semifinalWinners[1]!,
	})
}

export async function seedTournament(
	prisma: PrismaClient,
	config: SeedTournamentConfig,
) {
	console.log(`\n🏀 Seed torneo: ${config.name} (${config.format})`)

	await resetDatabase(prisma)

	const playground = await prisma.playground.create({
		data: {
			name: config.name,
			year: config.year,
			format: config.format,
		},
	})

	const gruppi = await Promise.all(
		config.groupColors.map(async (colore, index) =>
			prisma.group.create({
				data: {
					name: `Girone ${index + 1}`,
					color: colore,
					playgroundId: playground.id,
				},
			}),
		),
	)

	const usedTeamNames = new Set<string>()
	let totalTeams = 0

	for (const gruppo of gruppi) {
		const numeroSquadre = config.getTeamsPerGroup(gruppo.color)

		for (let i = 0; i < numeroSquadre; i++) {
			let teamName: string
			do {
				teamName = generateRandomTeam().name
			} while (usedTeamNames.has(teamName))

			usedTeamNames.add(teamName)
			totalTeams++

			const team = await prisma.team.create({
				data: {
					name: teamName,
					groupId: gruppo.id,
					playgroundId: playground.id,
				},
			})

			for (let j = 0; j < 5; j++) {
				await prisma.player.create({
					data: {
						...generateRandomPlayer(),
						teamId: team.id,
						playgroundId: playground.id,
					},
				})
			}
		}
	}

	console.log(
		`✓ ${gruppi.length} gironi, ${totalTeams} squadre, ${totalTeams * 5} giocatori`,
	)

	await scheduleGroupMatches(prisma, playground.id, gruppi)

	const allMatches = await prisma.match.findMany({
		where: { playgroundId: playground.id, day: { in: [1, 2, 3, 4] } },
	})

	for (const match of allMatches) {
		await generateMatchScores(match, prisma)
	}

	console.log(`✓ ${allMatches.length} partite gironi completate con risultati`)

	await simulatePlayinAndPlayoffs(prisma, playground.id)

	console.log(`✓ Play-in e playoff simulati`)
	console.log(`\nTorneo pronto: ${playground.name} (id: ${playground.id})`)
}
