// exclusive-bem-block: habit-module-events
import { useCallback, useMemo, useState } from 'react';
import type { SummationEvent, SummationEventCreatedAt } from '@habsum/types/common/habit';
import { BarGraph } from '@habsum/ui/components/graphs/BarGraph';
import { Button } from '@habsum/ui/components/Button';
import { ModalBody, ModalHeader, useModal } from '@habsum/ui/contexts/modal';
import { summationHourlyBarGraphData } from '@habsum/utils/summation-hourly-bar-data';

type EventsProps = {
  habitName: string;
  /** Calendar day for this habit row (`YYYY-MM-DD`); used to split same-day vs retroactive event timestamps. */
  dayKey: string;
  events: SummationEvent[] | undefined | null;
  /** Called when the bar graph hover opens for a bucket (`value` = sum of amounts logged in that hour). */
  onBarHover?: (detail: { key: string; value: number | null }) => void;
  /** Deletes one summation event by id; parent supplies any pending/error handling. */
  onDeleteSummationEvent: (eventId: number) => Promise<void>;
};

function formatEventAmount(amount: number) {
  return amount > 0 ? `+${amount}` : String(amount);
}

function formatEventClockDisplay(createdAt: SummationEventCreatedAt) {
  if (!createdAt.day) return createdAt.time || '—';
  if (!createdAt.time) {
    const local = new Date(
      Number(createdAt.day.slice(0, 4)),
      Number(createdAt.day.slice(5, 7)) - 1,
      Number(createdAt.day.slice(8, 10)),
    );
    if (Number.isNaN(local.getTime())) return createdAt.day;
    return local.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const m = createdAt.time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return createdAt.time;
  const d = new Date(2000, 0, 1, Number(m[1]), Number(m[2]), 0);
  if (Number.isNaN(d.getTime())) return createdAt.time;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** `YYYY-MM-DD` day key from the API — format in local calendar without TZ shift. */
function formatEventDay(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map((x) => Number(x));
  if (!y || !m || !d || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return dateKey;
  const local = new Date(y, m - 1, d);
  if (Number.isNaN(local.getTime())) return dateKey;
  return local.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function EventsModalContent({
  habitName,
  events,
  onDeleteEvent,
}: {
  habitName: string;
  events: SummationEvent[];
  onDeleteEvent: (eventId: number) => Promise<void>;
}) {
  const [rows, setRows] = useState(events);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (eventId: number) => {
    setDeletingId(eventId);
    try {
      await onDeleteEvent(eventId);
      setRows((prev) => prev.filter((e) => e.id !== eventId));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <ModalHeader>Events — {habitName}</ModalHeader>
      <ModalBody className="habit-module-events__modal-body">
        {rows.length > 0 ? (
          <ul className="habit-module-events__list">
            {rows.map((event) => (
              <li key={event.id} className="habit-module-events__event">
                <span className="text-h-m">{formatEventAmount(event.amount)}</span>
                <div className="habit-module-events__event-actions">
                  <span className="habit-module-events__datetime text-light text-b-m">
                    <span>{formatEventClockDisplay(event.createdAt)}</span>
                    <span>{formatEventDay(event.createdAt.day)}</span>
                  </span>
                  <Button
                    type="tertiary"
                    size="medium"
                    icon="close"
                    circle
                    aria-label="Remove this event"
                    disabled={deletingId !== null}
                    onClick={() => void handleDelete(event.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-light text-b-m">No summation events recorded for this day.</p>
        )}
      </ModalBody>
    </>
  );
}

export function Events({
  habitName,
  dayKey,
  events,
  onBarHover,
  onDeleteSummationEvent,
}: EventsProps) {
  const { present, closeModal } = useModal();

  const barGraphData = useMemo(
    () =>
      events == null || events.length === 0 ? {} : summationHourlyBarGraphData(events, dayKey),
    [events, dayKey],
  );

  const openEventsModal = useCallback(() => {
    if (events == null) return;
    present({
      content: (
        <EventsModalContent
          habitName={habitName}
          events={events}
          onDeleteEvent={onDeleteSummationEvent}
        />
      ),
    });
  }, [present, closeModal, habitName, events, onDeleteSummationEvent]);

  if (events == null) return null;

  if (events.length === 0) {
    return (
      <div className="habit-module-events">
        <p className="text-light text-b-m habit-module-events__empty">No data</p>
      </div>
    );
  }

  return (
    <div className="habit-module-events">
      <div className="text-light text-b-m habit-module-events__meta">
        <span>Today's events</span>
        <span className="habit-module-events__summary">
          <span>{events.length}</span>
          <Button
            type="tertiary"
            size="medium"
            icon="square-pen"
            circle
            aria-label={`Open events for ${habitName}`}
            onClick={openEventsModal}
          />
        </span>
      </div>
      <BarGraph data={barGraphData} onHover={onBarHover} />
    </div>
  );
}
