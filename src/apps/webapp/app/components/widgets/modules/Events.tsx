import { useCallback } from 'react';
import type { SummationEvent, SummationEventCreatedAt } from '@habsum/api-types';
import { Button } from '~/core-components/Button';
import { ModalActions, ModalBody, ModalTitle, useModal } from '~/context/modal';

type EventsProps = {
  habitName: string;
  events: SummationEvent[] | undefined | null;
};

function formatEventAmount(amount: number) {
  return amount > 0 ? `+${amount}` : String(amount);
}

function formatEventClockDisplay(createdAt: SummationEventCreatedAt) {
  if (!createdAt.day) return createdAt.time || '—';
  const wall = createdAt.time
    ? `${createdAt.day}T${createdAt.time}Z`
    : `${createdAt.day}T00:00:00Z`;
  const date = new Date(wall);
  if (Number.isNaN(date.getTime())) return createdAt.time || createdAt.day;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
  closeModal,
}: {
  habitName: string;
  events: SummationEvent[];
  closeModal: () => void;
}) {
  return (
    <>
      <ModalTitle>Events — {habitName}</ModalTitle>
      <ModalBody className="events__modal-body">
        {events.length > 0 ? (
          <ul className="events__list">
            {events.map((event) => (
              <li key={event.id} className="events__event">
                <span className="text-h-m">{formatEventAmount(event.amount)}</span>
                <span className="events__datetime text-light text-b-m">
                  <span>{formatEventClockDisplay(event.createdAt)}</span>
                  <span>{formatEventDay(event.createdAt.day)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-light text-b-m">No summation events recorded for this day.</p>
        )}
      </ModalBody>
      <ModalActions>
        <Button type="secondary" size="small" text="Close" onClick={closeModal} />
      </ModalActions>
    </>
  );
}

export function Events({ habitName, events }: EventsProps) {
  const { present, closeModal } = useModal();

  const openEventsModal = useCallback(() => {
    if (events == null) return;
    present({
      content: <EventsModalContent habitName={habitName} events={events} closeModal={closeModal} />,
    });
  }, [present, closeModal, habitName, events]);

  if (events == null) return null;

  return (
    <div className="events">
      <div className="text-light text-b-m events__meta">
        <span>Events</span>
        <span className="events__summary">
          <span>{events.length}</span>
          <Button
            type="tertiary"
            size="small"
            icon="square-pen"
            circle
            aria-label={`Open events for ${habitName}`}
            onClick={openEventsModal}
          />
        </span>
      </div>
    </div>
  );
}
