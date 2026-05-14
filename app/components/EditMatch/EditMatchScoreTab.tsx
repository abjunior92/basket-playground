import { Form } from '@remix-run/react'
import { MatchPlayerScoreCard } from './MatchPlayerScoreCard'
import { MatchScoresHeader } from './MatchScoresHeader'
import { MatchTeamFoulsGrid } from './MatchTeamFoulsGrid'
import { WalkoverSubmitSection } from './WalkoverSubmitSection'
import ErrorMessage from '~/components/ErrorMessage'

type TeamWithPlayers = {
	id: string
	name: string
	players: {
		id: string
		name: string
		surname: string
		teamId: string
		playgroundId: string
		warnings: number
		isExpelled: boolean
		retired: boolean
	}[]
}

type EditMatchScoreTabProps = {
	backLink: string
	score1: number | null
	score2: number | null
	team1: TeamWithPlayers
	team2: TeamWithPlayers
	matchId: string
	playerStatsMap: Map<string, number>
	temporaryAliases: Record<string, string>
	onOpenAliasDialog: (playerId: string) => void
	errorTeam1?: string
	errorTeam2?: string
}

export function EditMatchScoreTab({
	backLink,
	score1,
	score2,
	team1,
	team2,
	matchId,
	playerStatsMap,
	temporaryAliases,
	onOpenAliasDialog,
	errorTeam1,
	errorTeam2,
}: EditMatchScoreTabProps) {
	return (
		<Form method="post" className="space-y-5">
			<section className="section-blur space-y-6">
				<MatchScoresHeader
					team1={{ id: team1.id, name: team1.name, score: score1 }}
					team2={{ id: team2.id, name: team2.name, score: score2 }}
				/>
				<MatchTeamFoulsGrid team1Id={team1.id} team2Id={team2.id} />
			</section>

			<div className="grid grid-cols-2 md:gap-y-8">
				<div className="min-w-0 space-y-4 border-r border-slate-200/80 pr-2 sm:pr-4">
					{team1.players.map((player) => (
						<MatchPlayerScoreCard
							key={player.id}
							player={player}
							matchId={matchId}
							teamPlayersFieldName="team1Players[]"
							defaultPoints={playerStatsMap.get(player.id) ?? 0}
							aliasDisplay={
								temporaryAliases[player.id] || 'non impostato'
							}
							onOpenAliasDialog={onOpenAliasDialog}
						/>
					))}
					{errorTeam1 && <ErrorMessage message={errorTeam1} />}
				</div>
				<div className="min-w-0 space-y-4 pl-2 sm:pl-4">
					{team2.players.map((player) => (
						<MatchPlayerScoreCard
							key={player.id}
							player={player}
							matchId={matchId}
							teamPlayersFieldName="team2Players[]"
							defaultPoints={playerStatsMap.get(player.id) ?? 0}
							aliasDisplay={
								temporaryAliases[player.id] || 'non impostato'
							}
							onOpenAliasDialog={onOpenAliasDialog}
						/>
					))}
					{errorTeam2 && <ErrorMessage message={errorTeam2} />}
				</div>
			</div>

			<input type="hidden" name="backLink" value={backLink} />
			<WalkoverSubmitSection />
		</Form>
	)
}
