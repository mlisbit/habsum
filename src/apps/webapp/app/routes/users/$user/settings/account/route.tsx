// exclusive-bem-block: account-page
import { useBlocker, useParams } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteUser,
  getUserSession,
  logout,
  patchUser,
  type UsersPatchRequest,
} from '~/api.client';
import { Button } from '~/core-components/Button';
import { Input } from '~/core-components/Input';
import { AlertModal, useModal } from '~/context/modal';
import { applyUiTheme, UI_THEME_OPTIONS } from '~/theme.client';

type ThemeOption = (typeof UI_THEME_OPTIONS)[number];

type AccountSnapshot = {
  username: string;
  displayName: string;
  theme: ThemeOption;
};

function normDisplay(s: string): string {
  return s.trim();
}

export default function UserSettingsAccount() {
  const { user: routeUser } = useParams();
  const [saved, setSaved] = useState<AccountSnapshot | null>(null);
  const [draftUsername, setDraftUsername] = useState('');
  const [draftDisplay, setDraftDisplay] = useState('');
  const [draftTheme, setDraftTheme] = useState<ThemeOption>('dark');
  const [status, setStatus] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  const loadAccount = useCallback(async () => {
    if (!routeUser) return;
    setStatus(null);
    const res = await getUserSession(routeUser);
    const display = res.displayName ?? '';
    const theme: ThemeOption = res.theme === 'light' ? 'light' : 'dark';
    const snap: AccountSnapshot = { username: routeUser, displayName: display, theme };
    setSaved(snap);
    setDraftUsername(routeUser);
    setDraftDisplay(display);
    setDraftTheme(theme);
    applyUiTheme(theme);
  }, [routeUser]);

  useEffect(() => {
    if (!routeUser) return;
    let cancelled = false;
    loadAccount().catch(() => {
      if (!cancelled) {
        /* auth handled by parent layout */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [routeUser, loadAccount]);

  const hasDirty = useMemo(() => {
    if (!saved) return false;
    return (
      normDisplay(draftUsername) !== normDisplay(saved.username) ||
      normDisplay(draftDisplay) !== normDisplay(saved.displayName) ||
      draftTheme !== saved.theme
    );
  }, [saved, draftUsername, draftDisplay, draftTheme]);

  const { present, closeModal } = useModal();
  const blocker = useBlocker(hasDirty);

  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  const presentRef = useRef(present);
  presentRef.current = present;
  const closeModalRef = useRef(closeModal);
  closeModalRef.current = closeModal;

  const hasDirtyRef = useRef(hasDirty);
  useEffect(() => {
    hasDirtyRef.current = hasDirty;
  }, [hasDirty]);

  useEffect(
    () => () => {
      if (hasDirtyRef.current && savedRef.current) {
        applyUiTheme(savedRef.current.theme);
      }
    },
    [],
  );

  const revertDrafts = useCallback(() => {
    if (!saved) return;
    setDraftUsername(saved.username);
    setDraftDisplay(saved.displayName);
    setDraftTheme(saved.theme);
    applyUiTheme(saved.theme);
    setStatus(null);
  }, [saved]);

  const revertDraftsRef = useRef(revertDrafts);
  revertDraftsRef.current = revertDrafts;

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const dismiss = presentRef.current({
      onRequestClose: () => {
        const b = blockerRef.current;
        if (b.state === 'blocked') b.reset();
      },
      content: (
        <AlertModal
          title="Unsaved changes"
          message="You have unsaved changes on this page. Leave now and they will be discarded."
          onCancel={() => closeModalRef.current()}
          onContinueWithoutSaving={() => {
            dismiss();
            revertDraftsRef.current();
            const b = blockerRef.current;
            if (b.state === 'blocked') b.proceed();
          }}
        />
      ),
    });
    return dismiss;
  }, [blocker.state]);

  const handleSave = async () => {
    if (!routeUser || !saved) return;
    const nextUsername = normDisplay(draftUsername);
    if (!nextUsername) {
      setStatus('Username cannot be empty.');
      return;
    }

    const patch: UsersPatchRequest = {};
    if (nextUsername !== saved.username) {
      patch.name = nextUsername;
    }
    const nextDisplay = normDisplay(draftDisplay);
    const savedDisplayNorm = normDisplay(saved.displayName);
    if (nextDisplay !== savedDisplayNorm) {
      patch.displayName = nextDisplay === '' ? null : nextDisplay;
    }
    if (draftTheme !== saved.theme) {
      patch.theme = draftTheme;
    }

    if (Object.keys(patch).length === 0) return;

    setSaveBusy(true);
    setStatus(null);
    try {
      const res = await patchUser(routeUser, patch);
      if (res.user !== routeUser) {
        window.location.assign(`/users/${encodeURIComponent(res.user)}/settings/account`);
        return;
      }
      const nextSnap: AccountSnapshot = {
        username: res.user,
        displayName: nextDisplay,
        theme: draftTheme,
      };
      setSaved(nextSnap);
      setDraftUsername(res.user);
      setDraftDisplay(nextDisplay);
      setDraftTheme(draftTheme);
      applyUiTheme(draftTheme);
      setStatus('Saved.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setSaveBusy(false);
    }
  };

  const loaded = saved != null;

  return (
    <div className="account-page">
      <div className="account-page__header">
        <h2 className="text-h-l">Account</h2>

        <div className="account-page__cta-row">
          <Button
            type="primary"
            text={saveBusy ? 'Saving…' : 'Save'}
            disabled={!loaded || !hasDirty || saveBusy || !normDisplay(draftUsername)}
            onClick={() => void handleSave()}
          />
          <Button
            type="secondary"
            text="Cancel"
            disabled={!loaded || !hasDirty || saveBusy}
            onClick={revertDrafts}
          />
        </div>
      </div>

      {status ? <p className="text-light text-b-m account-page__status">{status}</p> : null}

      <div className="account-page__profile">
        {!loaded ? (
          <p className="text-light text-b-m">Loading…</p>
        ) : (
          <>
            <div className="account-page__field">
              <label htmlFor="account-username" className="text-b-m">
                Username
              </label>
              <Input
                id="account-username"
                className="account-page__profile-input"
                value={draftUsername}
                onChange={setDraftUsername}
                placeholder="username"
                dismissable
                submittable={false}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={saveBusy}
              />
            </div>
            <div className="account-page__field">
              <label htmlFor="account-display-name" className="text-b-m">
                Display name
              </label>
              <Input
                id="account-display-name"
                className="account-page__profile-input"
                value={draftDisplay}
                onChange={setDraftDisplay}
                placeholder="Optional"
                dismissable
                submittable={false}
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                disabled={saveBusy}
              />
            </div>
            <div className="account-page__field">
              <label htmlFor="account-theme" className="text-b-m">
                Theme
              </label>
              <select
                id="account-theme"
                className="account-page__select text-b-m"
                value={draftTheme}
                disabled={saveBusy}
                onChange={(e) => {
                  const t = e.target.value === 'light' ? 'light' : 'dark';
                  setDraftTheme(t);
                  applyUiTheme(t);
                }}
              >
                {UI_THEME_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'dark' ? 'Dark' : 'Light'}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div className="card account-page__danger">
        <h3 className="account-page__danger-title text-h-s">Danger zone</h3>
        <p className="text-light text-b-m">
          Delete this user removes their YAML config and all stored habit data from the server. This
          cannot be undone.
        </p>
        <Button
          type="secondary"
          text={deleteBusy ? 'Deleting…' : 'Delete user'}
          disabled={!routeUser || deleteBusy}
          onClick={async () => {
            if (!routeUser) return;
            if (
              !window.confirm(
                `Delete user "${routeUser}"? This removes the YAML config and all stored habit data. This cannot be undone.`,
              )
            ) {
              return;
            }
            setDeleteBusy(true);
            setStatus(null);
            try {
              await deleteUser(routeUser);
              await logout().catch(() => {});
              window.location.assign('/login');
            } catch (e) {
              setStatus(e instanceof Error ? e.message : String(e));
            } finally {
              setDeleteBusy(false);
            }
          }}
        />
      </div>
    </div>
  );
}
