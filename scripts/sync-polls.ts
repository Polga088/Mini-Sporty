import "dotenv/config";

import { prisma } from "@/lib/prisma";
import { syncPolls } from "@/lib/poll-sync";

async function main() {
  const result = await syncPolls(prisma);

  console.log(`Sondages traités: ${result.processedPolls}`);
  console.log(`Sondages clôturés: ${result.closedPolls}`);
  console.log(`Participants promus: ${result.promotedParticipants}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("[polls:sync] Échec de la synchronisation des sondages.");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
