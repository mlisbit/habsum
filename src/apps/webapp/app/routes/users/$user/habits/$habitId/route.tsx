import { useEffect, useMemo, useState } from "react";
import { Calendar, type CalendarDataRender } from "~/components/Calendar";
import { Button } from "~/components/Button";
import { ProgressBar } from "~/components/ProgressBar";
import { SingleSelectWidget, SummationWidget } from "~/components/widgets";
import { getHabitDetail, patchHabit, type Habit } from "~/api.client";
import { toDateKey } from "@habsum/utils";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function withoutHistory<T extends Habit>(habit: T): T {
  const { history: _omit, ...rest } = habit;
  return rest as T;
}

function upsertDayRow(
  rows: Array<{ day: string; habits: Habit[] }>,
  day: string,
  nextHabit: Habit
): Array<{ day: string; habits: Habit[] }> {
  const idx = rows.findIndex((r) => r.day === day);
  const nextRow = { day, habits: [nextHabit] };
  if (idx === -1) return [...rows, nextRow].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const copy = rows.slice();
  copy[idx] = nextRow;
  return copy;
}

// Habit detail — /users/:user/habits/:habitId (habitId = dasherized habit name)
export default function HabitDetailRoute() {
  const [habitId, setHabitId] = useState<string>("");
  const [user, setUser] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [habitData, setHabitData] = useState<Awaited<
    ReturnType<typeof getHabitDetail>
  > | null>(null);
  const [habitError, setHabitError] = useState<string | null>(null);
  const [firstDate, setFirstDate] = useState<string | null>(null);
  const tzOffsetMinutes = useMemo(() => new Date().getTimezoneOffset(), []);
  const today = useMemo(
    () => toDateKey(new Date(), tzOffsetMinutes),
    [tzOffsetMinutes]
  );
  const effectiveDate = selectedDate ?? today;

  useEffect(() => {
    const match = window.location.pathname.match(
      /^\/users\/([^/]+)\/habits\/([^/]+)\/?$/
    );
    setUser(match ? decodeURIComponent(match[1]) : "");
    setHabitId(match ? decodeURIComponent(match[2]) : "");

    const syncFromUrl = () => {
      const q = new URLSearchParams(window.location.search);
      setSelectedDate(q.get("date"));
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    if (!habitId || !user) return;
    setHabitError(null);
    setHabitData(null);
    setFirstDate(null);
    getHabitDetail(user, habitId)
      .then((d) => {
        setHabitData(d);
        setFirstDate(d.firstDate);
      })
      .catch((e) =>
        setHabitError(e instanceof Error ? e.message : String(e))
      );
  }, [habitId, user]);

  const setSelectedDateInUrl = (date: string) => {
    const qs = new URLSearchParams(window.location.search);
    qs.set("date", date);
    const nextUrl = `${window.location.pathname}?${qs.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setSelectedDate(date);
  };

  const habitForWidget = useMemo(() => {
    if (!habitData) return null;

    const row = habitData.data.user.find((r) => r.day === effectiveDate);
    const fromRow = row?.habits.find((h) => h.name === habitData.habitName);

    if (fromRow) return withoutHistory(fromRow);

    if (habitData.habitType === "single_select") {
      return withoutHistory({
        name: habitData.habitName,
        type: "single_select",
        goal: habitData.habitGoal,
        options: habitData.habitOptions,
        value: null,
      } satisfies Habit);
    }

    return withoutHistory({
      name: habitData.habitName,
      type: "summation",
      goal: habitData.habitGoal,
      total: 0,
    } satisfies Habit);
  }, [habitData, effectiveDate]);

  const onHabitPatched = (updated: Habit) => {
    setHabitData((prev) => {
      if (!prev) return prev;
      const name = prev.habitName;
      const prevRow = prev.data.user.find((r) => r.day === effectiveDate);
      const prevHabit = prevRow?.habits.find((h) => h.name === name);

      const merged =
        updated.type === "single_select"
          ? ({
              name,
              type: "single_select",
              goal: prevHabit?.type === "single_select" ? prevHabit.goal : prev.habitGoal,
              options:
                prevHabit?.type === "single_select"
                  ? prevHabit.options
                  : prev.habitOptions,
              value: updated.value ?? null,
            } satisfies Habit)
          : ({
              name,
              type: "summation",
              goal: updated.goal,
              total: updated.total,
            } satisfies Habit);

      return {
        ...prev,
        data: {
          ...prev.data,
          user: upsertDayRow(prev.data.user, effectiveDate, merged),
        },
      };
    });
  };

  const dataRenders = useMemo<CalendarDataRender[]>(
    () => {
      const entries = habitData?.data.user ?? [];
      return entries.flatMap((row) => {
        const habit = row.habits[0];
        if (!habit) return [];

        const scale =
          habit.type === "summation"
            ? (() => {
                const goal = habit.goal ?? 0;
                if (goal <= 0) return 1;
                const ratio = habit.total / goal;
                // Map 0..1..2+ -> 0.6..1.2..1.5 (clamped)
                return clamp(0.6 + ratio * 0.6, 0.6, 1.5);
              })()
            : 1;

        return [
          {
            date: row.day,
            callRender: () => (
              <span
                className="calendar__dot"
                aria-hidden
                style={{ transform: `scale(${scale})` }}
              />
            ),
            hoverContent: () => (
                <div className="calendar-day-hover">
                  {row.habits.map((h) => (
                    <div key={h.name} className="calendar-day-hover__habit">
                      {h.type === "summation" ? (
                        <>
                          <strong>{h.name}</strong>
                          {h.goal != null && h.goal > 0 ? (
                            <ProgressBar
                              className="calendar-day-hover__progress"
                              value={h.total}
                              max={h.goal}
                              aria-label={`${h.name}: ${h.total} of ${h.goal}`}
                            />
                          ) : (
                            <div className="muted">
                              {h.total}
                              {h.goal != null ? ` / ${h.goal}` : ""}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <strong>{h.name}</strong>
                          <div className="muted">
                            {h.value ?? "—"}
                            {h.options.length > 0 ? (
                              <span> · {h.options.join(", ")}</span>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
            ),
          },
        ];
      });
    },
    [habitData]
  );

  return (
    <div className="container container--wide">
      <div className="header-row">
        <Button
          type="secondary"
          icon="chevronBack"
          circle
          text=""
          title="Back to habits"
          aria-label="Back to habits"
          onClick={() =>
            window.location.assign(
              `/users/${encodeURIComponent(user)}/habits${
                selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : ""
              }`
            )
          }
        />
        <h1>{habitData?.habitName ?? (habitId || "Habit")}</h1>
      </div>

      <div className="habit-history">
        <div className="habit-history__calendar">
          <div className="card">
            <Calendar
              tzOffsetMinutes={tzOffsetMinutes}
              lastData={toDateKey(new Date(), tzOffsetMinutes)}
              firstDate={firstDate ?? undefined}
              selectedDate={selectedDate ?? undefined}
              onDaySelect={setSelectedDateInUrl}
              dataRenders={dataRenders}
              greyOutDaysWithoutData
            />
          </div>
        </div>

        <div className="habit-history__widget">
          {habitError ? <p className="warn">{habitError}</p> : null}
          {!habitError && habitData == null ? (
            <p className="muted" aria-busy>
              Loading habit data…
            </p>
          ) : null}
          {!habitError && habitData && habitForWidget ? (
            habitForWidget.type === "single_select" ? (
              <SingleSelectWidget
                user={habitData.user}
                habit={habitForWidget}
                onSelectOption={async (opt) => {
                  const updated = await patchHabit(
                    habitData.user,
                    { habit: habitForWidget.name, value: opt },
                    { date: effectiveDate }
                  );
                  onHabitPatched({ ...habitForWidget, ...updated, value: opt } as Habit);
                }}
              />
            ) : (
              <SummationWidget
                user={habitData.user}
                habit={habitForWidget}
                onAddAmount={async (delta) => {
                  const updated = await patchHabit(
                    habitData.user,
                    { habit: habitForWidget.name, total: delta },
                    { date: effectiveDate }
                  );
                  onHabitPatched({ ...habitForWidget, ...updated } as Habit);
                }}
              />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
