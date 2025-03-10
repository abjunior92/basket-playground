import { PrismaClient } from "@prisma/client";
import { type ActionFunctionArgs, json } from "@remix-run/node";

const prisma = new PrismaClient();

export const loader = async () => {
  const players = await prisma.player.findMany();
  return json(players);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const surname = formData.get("surname") as string;
  const teamId = formData.get("teamId") as string;

  if (!name || !surname || !teamId)
    return json({ error: "Dati mancanti" }, { status: 400 });

  const player = await prisma.player.create({
    data: { name, surname, teamId },
  });
  return json(player);
};
