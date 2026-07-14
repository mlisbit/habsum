import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalProvider, useModal } from '@habsum/ui/contexts/modal';

function ModalHarness({ afterClose }: { afterClose: () => void }) {
  const { present, closeModalThen } = useModal();

  return (
    <button
      type="button"
      onClick={() => {
        present({
          content: (
            <button type="button" onClick={() => closeModalThen(afterClose)}>
              Edit widget
            </button>
          ),
        });
      }}
    >
      Open options
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
});

describe('ModalProvider', () => {
  it('runs a navigation action only after the modal history entry closes', () => {
    const afterClose = vi.fn();
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);

    render(
      <ModalProvider>
        <ModalHarness afterClose={afterClose} />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit widget' }));

    expect(back).toHaveBeenCalledOnce();
    expect(afterClose).not.toHaveBeenCalled();

    act(() => window.dispatchEvent(new PopStateEvent('popstate')));

    expect(afterClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Edit widget' })).toBeNull();
  });
});
