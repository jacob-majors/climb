import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <Card className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Page not found</h1>
      <p className="text-sm text-ink/70">That page does not exist anymore, or the link is out of date.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-chalk">
          Back to dashboard
        </Link>
        <Link href="/plans" className="inline-flex rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink">
          Saved plans
        </Link>
      </div>
    </Card>
  );
}
