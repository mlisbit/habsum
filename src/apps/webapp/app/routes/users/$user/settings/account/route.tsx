// exclusive-bem-block: account-page
import { useBlocker, useNavigate, useParams } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DayWithTime } from '@habsum/types/common/day';
import { dateFromDayWithTimeUtc } from '@habsum/types/common/day';
import type { ProductEntitlement } from '@habsum/types/common/entitlement';
import {
  deleteUser,
  getUserSession,
  logout,
  patchUser,
  type UsersPatchRequest,
} from '~/api.client';
import { SettingsHeader } from '~/components/SettingsHeader';
import { Button } from '~/core-components/Button';
import { InfoText } from '~/core-components/InfoText';
import { Input } from '~/core-components/Input';
import { AlertModal, useModal } from '~/context/modal';
import { useToast } from '~/context/toast';
import { useUser } from '~/context/user';
import {
  accountServerErrorToFieldMap,
  type AccountErrorMap,
  type AccountFieldKey,
  validateAccountSave,
} from '~/utils/validators/account';
import { applyUiTheme, UI_THEME_OPTIONS } from '~/theme.client';

type ThemeOption = (typeof UI_THEME_OPTIONS)[number];

type AccountSnapshot = {
  username: string;
  displayName: string;
  email: string;
  theme: ThemeOption;
  createdAt: DayWithTime;
  entitlements: ProductEntitlement[];
};

function formatAccountCreatedAt(value: DayWithTime): string {
  const d = dateFromDayWithTimeUtc(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(d);
}

function normDisplay(s: string): string {
  return s.trim();
}

function normEmail(s: string): string {
  return s.trim().toLowerCase();
}

function SaveFieldErrors({
  id,
  messages,
  className,
}: {
  id: string;
  messages: string[] | undefined;
  className: string;
}) {
  if (!messages?.length) return null;
  return (
    <InfoText variant="error" className={className} id={id} aria-live="polite">
      {messages.join(' ')}
    </InfoText>
  );
}

export default function UserSettingsAccount() {
  const navigate = useNavigate();
  const { refresh } = useUser();
  const { user: routeUser } = useParams();
  const [saved, setSaved] = useState<AccountSnapshot | null>(null);
  const [draftUsername, setDraftUsername] = useState('');
  const [draftDisplay, setDraftDisplay] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftTheme, setDraftTheme] = useState<ThemeOption>('dark');
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [saveFieldErrors, setSaveFieldErrors] = useState<AccountErrorMap>({});
  const { showToast } = useToast();

  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  const loadAccount = useCallback(async () => {
    if (!routeUser) return;
    const res = await getUserSession(routeUser);
    const display = res.displayName ?? '';
    const email = res.email ?? '';
    const theme: ThemeOption = res.theme === 'light' ? 'light' : 'dark';
    const snap: AccountSnapshot = {
      username: routeUser,
      displayName: display,
      email,
      theme,
      createdAt: res.createdAt,
      entitlements: res.entitlements ?? [],
    };
    setSaved(snap);
    setDraftUsername(routeUser);
    setDraftDisplay(display);
    setDraftEmail(email);
    setDraftTheme(theme);
    applyUiTheme(theme);
    setSaveFieldErrors({});
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
      normEmail(draftEmail) !== normEmail(saved.email) ||
      draftTheme !== saved.theme
    );
  }, [saved, draftUsername, draftDisplay, draftEmail, draftTheme]);

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

  const clearSaveFieldError = useCallback((key: AccountFieldKey) => {
    setSaveFieldErrors((prev) => {
      if (prev[key] == null) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const revertDrafts = useCallback(() => {
    if (!saved) return;
    setDraftUsername(saved.username);
    setDraftDisplay(saved.displayName);
    setDraftEmail(saved.email);
    setDraftTheme(saved.theme);
    applyUiTheme(saved.theme);
    setSaveFieldErrors({});
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
    const nextDisplay = normDisplay(draftDisplay);
    const nextEmail = normEmail(draftEmail);

    const patch: UsersPatchRequest = {};
    if (nextUsername !== saved.username) {
      patch.username = nextUsername;
    }
    const savedDisplayNorm = normDisplay(saved.displayName);
    if (nextDisplay !== savedDisplayNorm) {
      patch.displayName = nextDisplay === '' ? null : nextDisplay;
    }
    if (nextEmail !== normEmail(saved.email)) {
      patch.email = nextEmail;
    }
    if (draftTheme !== saved.theme) {
      patch.theme = draftTheme;
    }

    const validationErrors = validateAccountSave({
      username: nextUsername,
      displayName: nextDisplay === '' ? null : nextDisplay,
      email: nextEmail,
      theme: draftTheme,
    });
    const validationMessages = Object.values(validationErrors).flat();
    if (validationMessages.length > 0) {
      setSaveFieldErrors(validationErrors);
      showToast({ type: 'error', message: validationMessages[0] });
      return;
    }
    setSaveFieldErrors({});

    if (Object.keys(patch).length === 0) return;

    setSaveBusy(true);
    try {
      const res = await patchUser(routeUser, patch);
      if (res.username !== routeUser) {
        await refresh();
        navigate(`/users/${encodeURIComponent(res.username)}/settings/account`);
        return;
      }
      const nextSnap: AccountSnapshot = {
        username: res.username,
        displayName: nextDisplay,
        email: nextEmail,
        theme: draftTheme,
        createdAt: saved.createdAt,
        entitlements: saved.entitlements,
      };
      setSaved(nextSnap);
      setDraftUsername(res.username);
      setDraftDisplay(nextDisplay);
      setDraftEmail(nextEmail);
      setDraftTheme(draftTheme);
      applyUiTheme(draftTheme);

      showToast({ type: 'success', message: 'Saved.' });
      setSaveFieldErrors({});
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const mapped = accountServerErrorToFieldMap(msg);
      setSaveFieldErrors(mapped);
      showToast({ type: 'error', message: msg });
    } finally {
      setSaveBusy(false);
    }
  };

  const loaded = saved != null;

  return (
    <div className="account-page">
      {loaded ? (
        <div className="card account-page__meta">
          <h3 className="account-page__meta-heading text-h-s" id="account-meta">
            Account
          </h3>
          <div className="account-page__meta-rows">
            <div className="account-page__meta-row">
              <div className="account-page__meta-label text-b-m text-light">Created</div>
              <div className="account-page__meta-value text-b-m">
                {formatAccountCreatedAt(saved.createdAt)}
              </div>
            </div>
            <div className="account-page__meta-row">
              <div className="account-page__meta-label text-b-m text-light">Entitlements</div>
              <div className="account-page__meta-value text-b-m">
                {saved.entitlements.length > 0 ? saved.entitlements.join(', ') : '—'}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card card--no-padding">
        <SettingsHeader
          title="Edit account"
          actions={
            <>
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
            </>
          }
        />

        <div className="card-padding">
          {!loaded ? (
            <p className="text-light text-b-m">Loading…</p>
          ) : (
            <div className="account-page__basic">
              <div className="account-page__field">
                <label htmlFor="account-username" className="account-page__label text-b-m">
                  Username
                </label>
                <div className="account-page__control">
                  <Input
                    id="account-username"
                    size="small"
                    className="account-page__profile-input"
                    value={draftUsername}
                    onChange={(v) => {
                      setDraftUsername(v);
                      clearSaveFieldError('username');
                    }}
                    placeholder="username"
                    dismissable
                    submittable={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={saveBusy}
                    aria-describedby={
                      saveFieldErrors.username?.length ? 'account-field-error-username' : undefined
                    }
                  />
                  <SaveFieldErrors
                    id="account-field-error-username"
                    messages={saveFieldErrors.username}
                    className="account-page__field-error"
                  />
                </div>
              </div>
              <div className="account-page__field">
                <label htmlFor="account-display-name" className="account-page__label text-b-m">
                  Display name
                </label>
                <div className="account-page__control">
                  <Input
                    id="account-display-name"
                    size="small"
                    className="account-page__profile-input"
                    value={draftDisplay}
                    onChange={(v) => {
                      setDraftDisplay(v);
                      clearSaveFieldError('displayName');
                    }}
                    placeholder="Optional"
                    dismissable
                    submittable={false}
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={saveBusy}
                  />
                  <SaveFieldErrors
                    id="account-field-error-displayName"
                    messages={saveFieldErrors.displayName}
                    className="account-page__field-error"
                  />
                </div>
              </div>
              <div className="account-page__field">
                <label htmlFor="account-email" className="account-page__label text-b-m">
                  Email
                </label>
                <div className="account-page__control">
                  <Input
                    id="account-email"
                    size="small"
                    className="account-page__profile-input"
                    value={draftEmail}
                    onChange={(v) => {
                      setDraftEmail(v);
                      clearSaveFieldError('email');
                    }}
                    placeholder="Required"
                    dismissable
                    submittable={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="email"
                    inputMode="email"
                    disabled={saveBusy}
                    aria-describedby={
                      saveFieldErrors.email?.length ? 'account-field-error-email' : undefined
                    }
                  />
                  <SaveFieldErrors
                    id="account-field-error-email"
                    messages={saveFieldErrors.email}
                    className="account-page__field-error"
                  />
                </div>
              </div>
              <div className="account-page__field">
                <label htmlFor="account-theme" className="account-page__label text-b-m">
                  Theme
                </label>
                <div className="account-page__control">
                  <select
                    id="account-theme"
                    className="account-page__select text-b-m"
                    value={draftTheme}
                    disabled={saveBusy}
                    aria-describedby={
                      saveFieldErrors.theme?.length ? 'account-field-error-theme' : undefined
                    }
                    onChange={(e) => {
                      const t = e.target.value === 'light' ? 'light' : 'dark';
                      setDraftTheme(t);
                      applyUiTheme(t);
                      clearSaveFieldError('theme');
                    }}
                  >
                    {UI_THEME_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt === 'dark' ? 'Dark' : 'Light'}
                      </option>
                    ))}
                  </select>
                  <SaveFieldErrors
                    id="account-field-error-theme"
                    messages={saveFieldErrors.theme}
                    className="account-page__field-error"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {loaded ? (
        <div className="card account-page__danger">
          <div>
            <h3 className="account-page__danger-title text-h-s">Danger zone</h3>
            <p className="text-light text-b-m">
              Delete this user. This removes their config and all stored data. This action cannot be
              undone.
            </p>
          </div>

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
              try {
                await deleteUser(routeUser);
                await logout().catch(() => {});
                window.location.assign('/login');
              } catch (e) {
                showToast({
                  type: 'error',
                  message: e instanceof Error ? e.message : String(e),
                });
              } finally {
                setDeleteBusy(false);
              }
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
