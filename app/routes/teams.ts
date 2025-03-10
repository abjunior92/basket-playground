import { PrismaClient } from "@prisma/client";
import { type ActionFunctionArgs, json } from "@remix-run/node";

const prisma = new PrismaClient();

export const loader = async () => {
  const teams = await prisma.team.findMany();
  return json(teams);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const groupId = formData.get("groupId") as string;

  if (!name || !groupId)
    return json({ error: "Dati mancanti" }, { status: 400 });

  const team = await prisma.team.create({ data: { name, groupId } });
  return json(team);
};
