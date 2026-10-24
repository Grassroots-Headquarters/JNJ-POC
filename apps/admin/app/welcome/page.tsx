import { Welcome } from "@/components/welcome";

/** The guided first Job a new Company is sent to after sign-up. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams;
  return <Welcome jobId={job ?? null} />;
}
