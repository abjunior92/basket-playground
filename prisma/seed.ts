import { PrismaClient } from '@prisma/client'
import {
	FOUR_GROUPS_SEED_CONFIG,
	FIVE_GROUPS_SEED_CONFIG,
	seedTournament,
	type SeedTournamentConfig,
} from './seed-shared'

const prisma = new PrismaClient()

const SEED_CONFIGS: Record<string, SeedTournamentConfig> = {
	four_groups: FOUR_GROUPS_SEED_CONFIG,
	five_groups: FIVE_GROUPS_SEED_CONFIG,
}

function resolveSeedConfig(): SeedTournamentConfig {
	const format = process.env.SEED_FORMAT ?? 'four_groups'
	const config = SEED_CONFIGS[format]

	if (!config) {
		throw new Error(
			`SEED_FORMAT non valido: "${format}". Usa "four_groups" o "five_groups".`,
		)
	}

	return config
}

async function main() {
	await seedTournament(prisma, resolveSeedConfig())
}

main()
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
