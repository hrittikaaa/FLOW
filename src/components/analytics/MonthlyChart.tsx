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



const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

interface MonthlyChartProps {
  /** Bump this to force a refetch, e.g. after a manual entry is logged. */
  refreshKey?: number;
}

export function MonthlyChart({ refreshKey = 0 }: MonthlyChartProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

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

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  function goBack() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goForward() {
    if (isCurrentMonth) return;
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    const from = startOfMonth(year, month);
    const to = endOfMonth(year, month);
    (async () => {
      const { data } = await supabase
        .from("focus_sessions")
        .select("category,duration_minutes,kind,occurred_at")
        .eq("kind", "focus")
        .gte("occurred_at", from.toISOString())
        .lte("occurred_at", to.toISOString());
      if (active) {
        setRows((data as SessionRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [year, month, refreshKey]);

  const { chartData, categories } = useMemo(() => {
    const totalDays = daysInMonth(year, month);
    const categorySet = new Set<string>();
    // key = "1" .. "31"
    const byDay: Record<string, Record<string, number>> = {};
    for (let d = 1; d <= totalDays; d++) byDay[String(d)] = {};

    rows.forEach((r) => {
      const d = String(new Date(r.occurred_at).getDate());
      categorySet.add(r.category);
      byDay[d][r.category] = (byDay[d][r.category] ?? 0) + r.duration_minutes / 60;
    });

    const data = Array.from({ length: totalDays }, (_, i) => ({
      day: String(i + 1),
      ...byDay[String(i + 1)],
    }));

    return { chartData: data, categories: uniqueCategories(categorySet) };
  }, [rows, year, month]);

  const totalHours = useMemo(
    () => rows.reduce((sum, r) => sum + r.duration_minutes, 0) / 60,
    [rows]
  );

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <button
              id="monthly-prev-btn"
              onClick={goBack}
              className="rounded-md p-1 text-muted transition-colors hover:bg-white/8 hover:text-paper"
              aria-label="Previous month"
            >
              <ChevronLeft size={15} />
            </button>
            <CardTitle className="min-w-[160px] text-center text-sm sm:text-base">
              {monthLabel}
            </CardTitle>
            <button
              id="monthly-next-btn"
              onClick={goForward}
              disabled={isCurrentMonth}
              className="rounded-md p-1 text-muted transition-colors hover:bg-white/8 hover:text-paper disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next month"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <CardDescription className="text-center">Daily focus hours by category</CardDescription>
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
            <p>No focus sessions logged this month.</p>
            <p className="text-xs">Finish a focus segment and it will show up here.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barSize={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="#8B8A99"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
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
                labelFormatter={(label) => `Day ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#8B8A99" }} />
              {categories.map((cat, i) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  stackId="focus"
                  fill={colorMap[cat] ?? "#8B8AFF"}
                  radius={i === categories.length - 1 ? [3, 3, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
