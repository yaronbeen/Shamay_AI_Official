import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PanelClient } from "./panel-client";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}

export default async function PanelPage({ params, searchParams }: PageProps) {
  // In Next.js 15, params and searchParams are Promises
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">טוען...</p>
          </div>
        </div>
      }
    >
      <PanelClient
        type={resolvedParams.type}
        sessionId={resolvedSearchParams.sessionId || null}
      />
    </Suspense>
  );
}
