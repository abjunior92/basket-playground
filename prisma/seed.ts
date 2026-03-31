import { PrismaClient, type Level, type ColorGroup } from '@prisma/client'

const prisma = new PrismaClient()

// Funzioni di utilità per generare nomi casuali
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

const coloriGironi: ColorGroup[] = ['red', 'blue', 'green', 'yellow', 'purple']

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

type TeamStats = {
	id: string
	name: string
	groupId: string
	wins: number
	played: number
	pointsScored: number
	pointsConceded: number
}

function generateTimeSlots() {
	const timeSlots: string[] = []
	let hour = 18
	let minute = 0

	while (hour < 22 || (hour === 22 && minute <= 35)) {
		const start = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

		// Aggiungi 15 minuti per ottenere l'orario di fine
		minute += 15
		if (minute >= 60) {
			minute = 0
			hour++
		}

		const end = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
		timeSlots.push(`${start} > ${end}`)

		// Aggiungi la pausa di 5 minuti
		minute += 5
		if (minute >= 60) {
			minute = 0
			hour++
		}
	}

	return timeSlots
}

// Funzione per calcolare gli slot disponibili per giorno
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

		// Domenica (giorno 1): tutti gli slot dalle 18:00
		if (giorno === 1) return true

		// Altri giorni: solo slot dalle 19:00
		return hour >= 19
	})

	// Ogni slot può ospitare 2 partite (campo A e B)
	return slots.length * 2
}

// Funzione per verificare se ci sono abbastanza slot
function verificaDisponibilitaSlot(
	gruppo: any,
	allTimeSlots: string[],
	giorni: number[],
): boolean {
	const numeroSquadre = gruppo.teams.length
	const partiteTotali = (numeroSquadre * (numeroSquadre - 1)) / 2

	console.log(`\nAnalisi slot per ${gruppo.name} (${numeroSquadre} squadre):`)
	console.log(`Ogni squadra deve giocare ${numeroSquadre - 1} partite`)
	console.log(`Totale partite nel girone: ${partiteTotali}`)

	// Calcola gli slot disponibili per ogni giorno
	let slotTotaliDisponibili = 0
	const slotPerGiorno: number[] = []

	for (const giorno of giorni) {
		const slotGiorno = calcolaSlotDisponibili(allTimeSlots, giorno)
		slotTotaliDisponibili += slotGiorno
		slotPerGiorno.push(slotGiorno)

		const fasceOrarie = Math.floor(slotGiorno / 2)
		console.log(`\nGiorno ${giorno}:`)
		console.log(
			`- ${fasceOrarie} fasce orarie × 2 campi = ${slotGiorno} slot disponibili`,
		)

		// Mostra gli orari disponibili
		const orariGiorno = allTimeSlots.filter((slot) => {
			const [startTime] = slot.split(' > ')
			if (!startTime) return false
			const [hours] = startTime.split(':')
			if (!hours) return false
			const hour = parseInt(hours, 10)
			return giorno === 1 ? true : hour >= 19
		})
		console.log(`- Orari: ${orariGiorno.join(', ')}`)
	}

	console.log(`\nRiepilogo:`)
	console.log(`- Slot totali disponibili: ${slotTotaliDisponibili}`)
	console.log(`- Slot necessari: ${partiteTotali}`)
	console.log(
		`- Differenza: ${slotTotaliDisponibili - partiteTotali} slot in ${slotTotaliDisponibili - partiteTotali > 0 ? 'più' : 'meno'}`,
	)

	// Per un girone da 7 squadre, verifica che ci siano abbastanza slot per distribuire le partite
	if (numeroSquadre === 7) {
		console.log(`\nVerifica specifica per girone da 7 squadre:`)
		console.log(`- Ogni squadra deve giocare 6 partite`)
		console.log(`- Totale partite da distribuire: 21`)
		console.log(
			`- Media partite per giorno: ${(21 / giorni.length).toFixed(2)}`,
		)

		// Verifica se è possibile distribuire le partite nei giorni
		let maxPartitePerGiorno = Math.max(...slotPerGiorno)
		console.log(
			`- Massimo partite possibili in un giorno: ${maxPartitePerGiorno}`,
		)

		if (maxPartitePerGiorno < Math.ceil(21 / giorni.length)) {
			console.log(
				`⚠️ ATTENZIONE: Anche distribuendo le partite in modo ottimale, alcuni giorni dovrebbero ospitare più partite di quanto possibile`,
			)
		}
	}

	return slotTotaliDisponibili >= partiteTotali
}

// Funzione per generare punteggi casuali per una partita
async function generateMatchScores(
	match: { id: string; team1Id: string; team2Id: string },
	prisma: PrismaClient,
): Promise<{ winnerId: string; loserId: string }> {
	// Genera punteggi diversi per evitare pareggi
	let score1, score2
	do {
		score1 = getRandomInt(7, 21)
		score2 = getRandomInt(7, 21)
	} while (score1 === score2)

	// Determina il vincitore
	const winner = score1 > score2 ? match.team1Id : match.team2Id

	// Ottieni i giocatori delle due squadre
	const team1Players = await prisma.player.findMany({
		where: { teamId: match.team1Id },
	})
	const team2Players = await prisma.player.findMany({
		where: { teamId: match.team2Id },
	})

	if (team1Players.length === 0 || team2Players.length === 0) {
		throw new Error(`Squadra non trovata per la partita ${match.id}`)
	}

	// Distribuisci i punti tra i giocatori della squadra 1
	const team1Points = distributePoints(score1, team1Players.length)
	const team2Points = distributePoints(score2, team2Players.length)

	// Crea le statistiche per ogni giocatore
	for (let i = 0; i < team1Players.length; i++) {
		const player = team1Players[i]
		if (!player) continue

		await prisma.playerMatchStats.create({
			data: {
				matchId: match.id,
				playerId: player.id,
				points: team1Points[i],
			},
		})

		// Aggiorna il totale punti del giocatore
		await prisma.player.update({
			where: { id: player.id },
			data: { totalPoints: { increment: team1Points[i] } },
		})
	}

	for (let i = 0; i < team2Players.length; i++) {
		const player = team2Players[i]
		if (!player) continue

		await prisma.playerMatchStats.create({
			data: {
				matchId: match.id,
				playerId: player.id,
				points: team2Points[i],
			},
		})

		// Aggiorna il totale punti del giocatore
		await prisma.player.update({
			where: { id: player.id },
			data: { totalPoints: { increment: team2Points[i] } },
		})
	}

	// Aggiorna il punteggio della partita
	await prisma.match.update({
		where: { id: match.id },
		data: {
			score1,
			score2,
			winner,
		},
	})

	return {
		winnerId: winner,
		loserId: winner === match.team1Id ? match.team2Id : match.team1Id,
	}
}

// Funzione per distribuire i punti tra i giocatori
function distributePoints(totalPoints: number, numPlayers: number): number[] {
	const points = new Array(numPlayers).fill(0)
	let remainingPoints = totalPoints

	// Assicurati che almeno un giocatore segni punti
	const minPoints = Math.min(2, Math.floor(totalPoints / numPlayers))
	points.forEach((_, index) => {
		points[index] = minPoints
		remainingPoints -= minPoints
	})

	// Distribuisci i punti rimanenti casualmente
	while (remainingPoints > 0) {
		const playerIndex = Math.floor(Math.random() * numPlayers)
		const pointsToAdd = Math.min(remainingPoints, getRandomInt(1, 3))
		points[playerIndex] += pointsToAdd
		remainingPoints -= pointsToAdd
	}

	return points
}

function compareTeamStats(a: TeamStats, b: TeamStats): number {
	const winPctA = a.played > 0 ? a.wins / a.played : 0
	const winPctB = b.played > 0 ? b.wins / b.played : 0
	if (winPctA !== winPctB) return winPctB - winPctA

	const diffA = a.pointsScored - a.pointsConceded
	const diffB = b.pointsScored - b.pointsConceded
	if (diffA !== diffB) return diffB - diffA

	if (a.pointsScored !== b.pointsScored) return b.pointsScored - a.pointsScored
	return a.name.localeCompare(b.name)
}

async function computeGroupRankings(playgroundId: string) {
	const groups = await prisma.group.findMany({
		where: { playgroundId },
		include: {
			teams: {
				include: {
					matchesAsTeam1: {
						where: { day: { in: [1, 2, 3, 4, 6] }, winner: { not: null } },
						select: {
							id: true,
							team1Id: true,
							team2Id: true,
							score1: true,
							score2: true,
							winner: true,
						},
					},
					matchesAsTeam2: {
						where: { day: { in: [1, 2, 3, 4, 6] }, winner: { not: null } },
						select: {
							id: true,
							team1Id: true,
							team2Id: true,
							score1: true,
							score2: true,
							winner: true,
						},
					},
				},
			},
		},
	})

	const rankings = groups.map((group) => {
		const teamStats: TeamStats[] = group.teams.map((team) => {
			const matches = [...team.matchesAsTeam1, ...team.matchesAsTeam2]

			let pointsScored = 0
			let pointsConceded = 0
			let wins = 0

			for (const match of matches) {
				const isTeam1 = match.team1Id === team.id
				pointsScored += isTeam1 ? (match.score1 ?? 0) : (match.score2 ?? 0)
				pointsConceded += isTeam1 ? (match.score2 ?? 0) : (match.score1 ?? 0)
				if (match.winner === team.id) wins++
			}

			return {
				id: team.id,
				name: team.name,
				groupId: group.id,
				wins,
				played: matches.length,
				pointsScored,
				pointsConceded,
			}
		})

		teamStats.sort(compareTeamStats)
		return { groupId: group.id, teams: teamStats }
	})

	const firstPlaced = rankings
		.map((r) => r.teams[0])
		.filter((team): team is TeamStats => team !== undefined)
	const secondPlaced = rankings
		.map((r) => r.teams[1])
		.filter((team): team is TeamStats => team !== undefined)
	const thirdPlaced = rankings
		.map((r) => r.teams[2])
		.filter((team): team is TeamStats => team !== undefined)
	const fourthPlaced = rankings
		.map((r) => r.teams[3])
		.filter((team): team is TeamStats => team !== undefined)
	const fifthPlaced = rankings
		.map((r) => r.teams[4])
		.filter((team): team is TeamStats => team !== undefined)

	secondPlaced.sort(compareTeamStats)
	thirdPlaced.sort(compareTeamStats)
	fourthPlaced.sort(compareTeamStats)
	fifthPlaced.sort(compareTeamStats)

	const directPlayoffTeams = [...firstPlaced, ...secondPlaced.slice(0, 3)]
	const playinTeams = [
		...secondPlaced.slice(3),
		...thirdPlaced,
		...fourthPlaced,
		...fifthPlaced.slice(0, 4),
	]

	return { directPlayoffTeams, playinTeams }
}

async function createAndScoreMatch(data: {
	playgroundId: string
	day: number
	timeSlot: string
	field: string
	team1Id: string
	team2Id: string
}) {
	const match = await prisma.match.create({ data })
	return generateMatchScores(match, prisma)
}

// Funzione principale per popolare il database
async function main() {
	// 1. Reset del database
	await prisma.playerMatchStats.deleteMany()
	await prisma.threePointChallengeParticipant.deleteMany()
	await prisma.match.deleteMany()
	await prisma.player.deleteMany()
	await prisma.team.deleteMany()
	await prisma.group.deleteMany()
	await prisma.jerseyStock.deleteMany()
	await prisma.playground.deleteMany()

	// 2. Creazione del torneo
	const playground = await prisma.playground.create({
		data: {
			name: 'Longara 3vs3 2025',
			year: 2025,
		},
	})

	// 3. Creazione dei gironi
	const gruppi = await Promise.all(
		coloriGironi.map(async (colore, index) => {
			return prisma.group.create({
				data: {
					name: `Girone ${index + 1}`,
					color: colore,
					playgroundId: playground.id,
				},
			})
		}),
	)

	// 4. Creazione delle squadre e dei giocatori
	const usedTeamNames = new Set<string>()

	for (const gruppo of gruppi) {
		const numeroSquadre =
			gruppo.color === 'red' || gruppo.color === 'blue' ? 7 : 6

		for (let i = 0; i < numeroSquadre; i++) {
			// Genera un nome squadra unico
			let teamName: string
			do {
				const randomTeam = generateRandomTeam()
				teamName = randomTeam.name
			} while (usedTeamNames.has(teamName))

			usedTeamNames.add(teamName)

			const team = await prisma.team.create({
				data: {
					name: teamName,
					groupId: gruppo.id,
					playgroundId: playground.id,
				},
			})

			// Creazione di 5 giocatori per squadra
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

	// 5. Creazione delle partite
	const allTimeSlots = generateTimeSlots()
	const fields = ['A', 'B'] as const
	const giorni = [1, 2, 3, 4] // Domenica a Mercoledì

	for (const gruppo of gruppi) {
		const teams = await prisma.team.findMany({
			where: { groupId: gruppo.id },
		})

		// Verifica disponibilità slot
		const gruppoConTeams = { ...gruppo, teams }
		if (!verificaDisponibilitaSlot(gruppoConTeams, allTimeSlots, giorni)) {
			throw new Error(
				`Non ci sono abbastanza slot disponibili per il girone ${gruppo.name}`,
			)
		}

		// Genera tutte le possibili combinazioni di partite
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

		// Verifica che il numero di partite sia corretto
		const numeroSquadre = teams.length
		const partiteAttese = (numeroSquadre * (numeroSquadre - 1)) / 2
		if (partite.length !== partiteAttese) {
			throw new Error(
				`Numero di partite errato per il girone ${gruppo.name}. Attese: ${partiteAttese}, Generate: ${partite.length}`,
			)
		}

		// Distribuisci le partite nei giorni disponibili
		const partitePerGiorno = Math.ceil(partite.length / giorni.length)
		let partitaIndex = 0

		for (const giorno of giorni) {
			const partiteDelGiorno = partite.slice(
				partitaIndex,
				partitaIndex + partitePerGiorno,
			)
			const squadreGiocateOggi = new Set<string>()
			const partitePerFascia = new Map<string, Set<string>>()

			// Filtra gli slot in base al giorno
			const timeSlots = allTimeSlots.filter((slot) => {
				const [startTime] = slot.split(' > ')
				if (!startTime) return false

				const [hours] = startTime.split(':')
				if (!hours) return false

				const hour = parseInt(hours, 10)

				// Domenica (giorno 1): tutti gli slot dalle 18:00
				if (giorno === 1) return true

				// Altri giorni: solo slot dalle 19:00
				return hour >= 19
			})

			// Inizializza le fasce orarie
			timeSlots.forEach((slot) => {
				partitePerFascia.set(slot, new Set<string>())
			})

			for (const [team1Id, team2Id] of partiteDelGiorno) {
				// Trova una fascia oraria e un campo disponibile
				let fasciaAssegnata = false
				for (const timeSlot of timeSlots) {
					// Verifica che le squadre non abbiano già giocato in questa fascia
					const fasciaCorrente = partitePerFascia.get(timeSlot)
					if (!fasciaCorrente) continue
					if (fasciaCorrente.has(team1Id) || fasciaCorrente.has(team2Id))
						continue

					// Verifica che le squadre non abbiano già giocato troppe partite oggi
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

					// Trova un campo disponibile
					for (const field of fields) {
						// Verifica se il campo è libero in questa fascia oraria
						const partitaEsistente = await prisma.match.findFirst({
							where: {
								day: giorno,
								timeSlot: timeSlot,
								field: field,
								playgroundId: playground.id,
							},
						})

						if (!partitaEsistente) {
							// Crea la partita
							await prisma.match.create({
								data: {
									playgroundId: playground.id,
									day: giorno,
									timeSlot: timeSlot,
									field: field,
									team1Id: team1Id,
									team2Id: team2Id,
								},
							})

							// Aggiorna i set di controllo
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

	// 6. Genera i risultati delle partite dei gironi
	const allMatches = await prisma.match.findMany({
		where: { playgroundId: playground.id },
	})

	for (const match of allMatches) {
		await generateMatchScores(match, prisma)
	}

	// 7. Simulazione play-in (giorno 5)
	const { directPlayoffTeams, playinTeams } = await computeGroupRankings(playground.id)

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

		const result = await createAndScoreMatch({
			playgroundId: playground.id,
			day: 5,
			timeSlot: slot,
			field,
			team1Id: team1.id,
			team2Id: team2.id,
		})

		playinWinners.push(result.winnerId)
	}

	// 8. Simulazione playoff completi (giorno 7)
	const seededTeams = [...directPlayoffTeams.map((t) => t.id), ...playinWinners]
	if (seededTeams.length !== 16) {
		throw new Error(`Tabellone playoff incompleto: ${seededTeams.length} squadre`)
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

		const result = await createAndScoreMatch({
			playgroundId: playground.id,
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

		const result = await createAndScoreMatch({
			playgroundId: playground.id,
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

		const result = await createAndScoreMatch({
			playgroundId: playground.id,
			day: 7,
			timeSlot: semifinalSlot,
			field,
			team1Id,
			team2Id,
		})

		semifinalWinners.push(result.winnerId)
		semifinalLosers.push(result.loserId)
	}

	if (semifinalLosers.length !== 2 || semifinalWinners.length !== 2) {
		throw new Error('Errore determinazione finaliste e finale 3° posto')
	}

	await createAndScoreMatch({
		playgroundId: playground.id,
		day: 7,
		timeSlot: thirdPlaceSlot,
		field: 'A',
		team1Id: semifinalLosers[0]!,
		team2Id: semifinalLosers[1]!,
	})

	await createAndScoreMatch({
		playgroundId: playground.id,
		day: 7,
		timeSlot: finalSlot,
		field: 'A',
		team1Id: semifinalWinners[0]!,
		team2Id: semifinalWinners[1]!,
	})
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
