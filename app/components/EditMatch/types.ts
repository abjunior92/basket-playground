/** Campo hidden array nel form punteggi */
export type TeamPlayersFieldName = 'team1Players[]' | 'team2Players[]'

export type EditMatchPlayerForCard = {
	id: string
	name: string
	surname: string
	teamId: string
	playgroundId: string
	warnings: number
	isExpelled: boolean
	retired: boolean
}

export type EditMatchGroupForPlanner = {
	id: string
	name: string
	teams: { id: string; name: string }[]
}
