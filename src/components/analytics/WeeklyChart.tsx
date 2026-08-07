import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buildColorMap, uniqueCategories } from "./analyticsUtils";

interface SessionRow {
  category: string;
  duration_minutes: number;
  kind: string;
  occurred_at: string;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(ws: Date) {
  const d = new Date(ws);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatWeekRange(ws: Date) {
  const we = endOfWeek(ws);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${ws.toLocaleDateString(undefined, opts)} – ${we.toLocaleDateString(undefined, opts)}`;
}

interface WeeklyChartProps {
  /** Bump this to force a refetch, e.g. after a manual entry is logged. */
  refreshKey?: number;
}

export function WeeklyChart({ refreshKey = 0 }: WeeklyChartProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [colorMap, setColorMap] = useState<Record<string, string>>({});

  // Fetch ALL categories once so the color map covers every category the user
  // has ever used — preventing any two categories from colliding on the same color.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("focus_sessions")
        .select("category")
        .eq("kind", "focus");
      if (data) {
        const all = Array.from(new Set((data as { category: string }[]).map((r) => r.category)));
        setColorMap(buildColorMap(all));
      }
    })();
  }, [refreshKey]);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const weekEnd = useMemo(() => endOfWeek(weekStart), [weekStart]);
  const isCurrentWeek = weekOffset === 0;

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("focus_sessions")
        .select("category,duration_minutes,kind,occurred_at")
        .eq("kind", "focus")
        .gte("occurred_at", weekStart.toISOString())
        .lte("occurred_at", weekEnd.toISOString());
      if (active) {
        setRows((data as SessionRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [weekStart, weekEnd, refreshKey]);

  const { chartData, categories } = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const categorySet = new Set<string>();
    const byDay: Record<string, Record<string, number>> = {};
    days.forEach((d) => (byDay[d] = {}));

    rows.forEach((r) => {
      const day = days[new Date(r.occurred_at).getDay()];
      categorySet.add(r.category);
      byDay[day][r.category] = (byDay[day][r.category] ?? 0) + r.duration_minutes / 60;
    });

    const data = days.map((day) => ({ day, ...byDay[day] }));
    return { chartData: data, categories: uniqueCategories(categorySet) };
  }, [rows]);

  const totalHours = useMemo(() => rows.reduce((sum, r) => sum + r.duration_minutes, 0) / 60, [rows]);

  const weekLabel = isCurrentWeek ? "This week" : formatWeekRange(weekStart);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <button
              id="weekly-prev-btn"
              onClick={() => setWeekOffset((o) => o - 1)}
              className="rounded-md p-1 text-muted transition-colors hover:bg-white/8 hover:text-paper"
              aria-label="Previous week"
            >
              <ChevronLeft size={15} />
            </button>
            <CardTitle className="min-w-[190px] text-center text-sm sm:text-base">{weekLabel}</CardTitle>
            <button
              id="weekly-next-btn"
              onClick={() => setWeekOffset((o) => o + 1)}
              disabled={isCurrentWeek}
              className="rounded-md p-1 text-muted transition-colors hover:bg-white/8 hover:text-paper disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next week"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <CardDescription className="text-center">Focus hours by block category</CardDescription>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold text-paper">{totalHours.toFixed(1)}h</p>
          <p className="text-xs text-muted">total focus time</p>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted">Loading…</div>
        ) : totalHours === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-1 text-center text-sm text-muted">
            <p>No completed focus sessions for this week.</p>
            <p className="text-xs">Finish a focus segment and it will show up here.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" stroke="#8B8A99" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#8B8A99" fontSize={12} tickLine={false} axisLine={false} width={28} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  background: "rgba(27,27,41,0.75)",
                  backdropFilter: "blur(16px) saturate(150%)",
                  WebkitBackdropFilter: "blur(16px) saturate(150%)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  boxShadow: "0 12px 32px -14px rgba(0,0,0,0.5)",
                  fontSize: 12,
                }}
                formatter={(value) => [`${Number(value ?? 0).toFixed(2)}h`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#8B8A99" }} />
              {categories.map((cat, i) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  stackId="focus"
                  fill={colorMap[cat] ?? "#8B8AFF"}
                  radius={i === categories.length - 1 ? [4, 4, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
