function getDatabaseName(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL manquant pour les tests.");
}

const databaseName = getDatabaseName(databaseUrl);

if (!/test/i.test(databaseName)) {
  throw new Error(`Base de test refusée: ${databaseName}. Utilise une base dont le nom contient "test".`);
}
