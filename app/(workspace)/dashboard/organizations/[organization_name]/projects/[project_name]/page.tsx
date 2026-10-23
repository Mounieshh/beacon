import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    organization_name: string;
    project_name: string;
  }>;
}

export default async function PluralOrgProjectDetailPage({ params }: PageProps) {
  const { organization_name, project_name } = await params;
  redirect(
    `/dashboard/organization/${encodeURIComponent(organization_name)}/projects/${encodeURIComponent(project_name)}`,
  );
}
