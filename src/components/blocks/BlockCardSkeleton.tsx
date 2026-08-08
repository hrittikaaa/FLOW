import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-full bg-white/10", className)} />;
}

/** Placeholder card shown in the blocks grid while `fetchBlocks` is in flight. */
export function BlockCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <Bar className="h-4 w-28" />
          <Bar className="h-5 w-16 rounded-full" />
        </div>
        <Bar className="h-3 w-20" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Bar className="h-1.5 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Bar className="h-3 w-24" />
          <Bar className="h-3 w-12" />
        </div>
        <div className="flex gap-2">
          <Bar className="h-8 flex-1 rounded-lg" />
          <Bar className="h-8 w-8 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}
