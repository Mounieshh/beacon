import { auth, clerkClient } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isStale, type Status } from "@/lib/pipeline/stages";
import type { RowData } from "@/components/progress/analysis-row";
import { ago } from "@/lib/time";

export interface DBOrganization {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  membersCount: number;
  projectCount: number;
  created: { iso: string; ago: string };
  role: string;
}

export async function loadOrganizations(): Promise<DBOrganization[]> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return [];

  const now = Date.now();
  const orgs: DBOrganization[] = [];

  // Query actual project count from Supabase for the current authenticated context
  let projectCount = 0;
  try {
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true });
    projectCount = count ?? 0;
  } catch {
    projectCount = 0;
  }

  // Fetch real memberships from Clerk
  try {
    const clerk = await clerkClient();
    const memberships = await clerk.users.getOrganizationMembershipList({ userId, limit: 100 });

    for (const m of memberships.data) {
      const org = m.organization;
      const createdIso = new Date(org.createdAt).toISOString();
      orgs.push({
        id: org.id,
        name: org.name,
        slug: org.slug || org.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        imageUrl: org.imageUrl,
        membersCount: org.membersCount ?? 1,
        projectCount,
        created: { iso: createdIso, ago: ago(createdIso, now) },
        role: m.role,
      });
    }
  } catch {
    // If Clerk list call fails, fallback to active token session claim
    const activeName = sessionClaims?.org_name as string | undefined;
    const activeId = sessionClaims?.org_id as string | undefined;
    if (activeName) {
      const createdIso = new Date().toISOString();
      orgs.push({
        id: activeId || "active",
        name: activeName,
        slug: activeName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        membersCount: 1,
        projectCount,
        created: { iso: createdIso, ago: ago(createdIso, now) },
        role: "admin",
      });
    }
  }

  return orgs;
}

const LIST_LIMIT = 100;

export async function loadOrganizationRuns(repoFilter?: string): Promise<RowData[]> {
  const supabase = await createServerSupabase();
  let query = supabase
    .from("analyses")
    .select("id, status, stage, stage_message, commit_sha, error, created_at, started_at, finished_at, projects!inner(repo_owner, repo_name)")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (repoFilter) {
    query = query.eq("projects.repo_name", repoFilter);
  }

  const { data: analyses, error } = await query;
  if (error) {
    // If !inner failed or no relation, fallback to default query
    const { data: fallback, error: fallbackError } = await supabase
      .from("analyses")
      .select("id, status, stage, stage_message, commit_sha, error, created_at, started_at, finished_at, projects(repo_owner, repo_name)")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT);
    if (fallbackError) throw new Error(`Couldn't load analyses: ${fallbackError.message}`);

    await connection();
    const now = Date.now();
    return (fallback ?? []).map((a) => ({
      id: a.id,
      repository: a.projects ? { owner: a.projects.repo_owner, name: a.projects.repo_name } : null,
      commitSha: a.commit_sha,
      progress: { status: a.status, stage: a.stage, message: a.status === "failed" ? a.error : a.stage_message },
      staleAtRender: isStale(a, now),
      created: { iso: a.created_at, ago: ago(a.created_at, now) },
      finished: a.finished_at ? { iso: a.finished_at, ago: ago(a.finished_at, now) } : null,
    }));
  }

  await connection();
  const now = Date.now();
  return (analyses ?? []).map((a) => ({
    id: a.id,
    repository: a.projects ? { owner: a.projects.repo_owner, name: a.projects.repo_name } : null,
    commitSha: a.commit_sha,
    progress: { status: a.status, stage: a.stage, message: a.status === "failed" ? a.error : a.stage_message },
    staleAtRender: isStale(a, now),
    created: { iso: a.created_at, ago: ago(a.created_at, now) },
    finished: a.finished_at ? { iso: a.finished_at, ago: ago(a.finished_at, now) } : null,
  }));
}
