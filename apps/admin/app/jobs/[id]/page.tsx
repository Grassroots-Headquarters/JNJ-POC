import { JobPage } from "@/components/job-page";

export default async function JobRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  return <JobPage jobId={id} justCreated={created === "1"} />;
}
