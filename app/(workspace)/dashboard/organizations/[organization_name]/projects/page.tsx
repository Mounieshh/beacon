import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    organization_name: string;
  }>;
}

export default async function PluralOrgProjectsPage({ params }: PageProps) {
  const { organization_name } = await params;
  redirect(`/dashboard/organization/${encodeURIComponent(organization_name)}/projects`);
}
