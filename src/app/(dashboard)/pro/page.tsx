import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface ProPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProPage({ searchParams }: ProPageProps) {
  const resolvedParams = await searchParams;
  const queryString = resolvedParams
    ? new URLSearchParams(
        Object.entries(resolvedParams).flatMap(([k, v]) =>
          Array.isArray(v) ? v.map((item) => [k, item]) : v !== undefined ? [[k, v]] : []
        )
      ).toString()
    : '';

  redirect(`/billing${queryString ? `?${queryString}` : ''}`);
}
