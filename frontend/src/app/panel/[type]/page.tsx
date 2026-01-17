import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PanelClient } from "./panel-client";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

interface PageProps {
  params: { type: string };
  searchParams: { sessionId?: string };
}

export default function PanelPage({ params, searchParams }: PageProps) {
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
        type={params.type}
        sessionId={searchParams.sessionId || null}
      />
    </Suspense>
  );
}
