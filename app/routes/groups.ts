import { PrismaClient } from "@prisma/client";
import { type ActionFunctionArgs, json } from "@remix-run/node";

const prisma = new PrismaClient();

export const loader = async () => {
  const groups = await prisma.group.findMany();
  return json(groups);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const playgroundId = formData.get("playgroundId") as string;

  if (!name || !playgroundId)
    return json({ error: "Dati mancanti" }, { status: 400 });

  const group = await prisma.group.create({ data: { name, playgroundId } });
  return json(group);
};
