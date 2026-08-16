import PublicAuthPortal from "@/components/public-auth-portal";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const params: QueryParams = searchParams ? await searchParams : {};
  const mode = firstValue(params.mode) === "register" ? "register" : "login";
  return <PublicAuthPortal defaultMode={mode} success={firstValue(params.success)} error={firstValue(params.error)} />;
}
