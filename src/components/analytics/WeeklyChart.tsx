import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface SessionRow {
  category: string;
  duration_minutes: number;
  kind: string;
  occurred_at: string;
}

const SERIES_COLORS = ["#F2A65A", "#6FD6C6", "#E8697D", "#8B8AFF", "#F2D95C", "#7FC8F8"];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function WeeklyChart() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const since = startOfWeek(new Date());
      const { data } = await supabase
        .from("focus_sessions")
        .select("category,duration_minutes,kind,occurred_at")
        .eq("kind", "focus")
        .gte("occurred_at", since.toISOString());
      if (active) {
        setRows((data as SessionRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
    return { chartData: data, categories: Array.from(categorySet) };
  }, [rows]);

  const totalHours = useMemo(() => rows.reduce((sum, r) => sum + r.duration_minutes, 0) / 60, [rows]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>This week</CardTitle>
          <CardDescription>Focus hours by block category</CardDescription>
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
            <p>No completed focus sessions yet this week.</p>
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
                  background: "#1B1B29",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
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
                  fill={SERIES_COLORS[i % SERIES_COLORS.length]}
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
