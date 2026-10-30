export {};

declare global {
  // Custom claims added in Clerk → Sessions → Customize session token.
  // The org name rides on the token so nothing has to ask Clerk for it.
  interface CustomJwtSessionClaims {
    org_name?: string;
  }

  type PageProps<T extends string = string> = {
    params: Promise<Record<string, string | string[] | undefined>>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
  };

  type LayoutProps<T extends string = string> = {
    children: React.ReactNode;
    params?: Promise<Record<string, string | string[] | undefined>>;
  };
}
