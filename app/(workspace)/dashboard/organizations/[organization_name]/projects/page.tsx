import React from "react";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    organization_name: string;
  }>;
}

class ErrorBoundary extends React.Component<{ hasError: boolean; error: Error }, { hasError: boolean; error: Error }> {
  constructor(props: React.ComponentProps<typeof React.Component>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return <>{this.props.children}</>;
  }
}

export default async function PluralOrgProjectsPage({ params }: PageProps) {
  const { organization_name } = await params;
  return (
    <ErrorBoundary>
      <div>Projects for {organization_name}</div>
    </ErrorBoundary>
  );
}
