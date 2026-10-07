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

function BackdropModalHarness() {
  const { present } = useModal();

  return (
    <button
      type="button"
      onClick={() => {
        present({
          history: false,
          content: <p>Select this modal text</p>,
        });
      }}
    >
      Open backdrop test
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

  it('only closes from a pointer interaction that starts on the backdrop', () => {
    render(
      <ModalProvider>
        <BackdropModalHarness />
      </ModalProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open backdrop test' }));
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement!;

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(backdrop);
    fireEvent.click(backdrop);

    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.pointerDown(backdrop);
    fireEvent.pointerUp(backdrop);
    fireEvent.click(backdrop);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
