import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";

type AccountPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");

  const params = (await searchParams) ?? {};
  const error = readParam(params.error);
  redirect(error ? `/profile?error=${encodeURIComponent(error)}` : "/profile");
}
