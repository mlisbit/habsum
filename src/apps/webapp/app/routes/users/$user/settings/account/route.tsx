// exclusive-bem-block: account-page
import { useBlocker, useNavigate, useParams } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DayWithTime } from '@habsum/types/common/day';
import { dateFromDayWithTimeUtc } from '@habsum/types/common/day';
import type { ProductEntitlement } from '@habsum/types/common/entitlement';
import {
  deleteUser,
  downloadUserDataCsv,
  getUserSession,
  logout,
  patchUser,
  type UsersPatchRequest,
} from '~/api.client';
import { SettingsHeader } from '~/components/SettingsHeader';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import { useUser } from '~/context/user';
import { UnsavedChangesModal } from '~/components/UnsavedChangesModal';
import {
  accountServerErrorToFieldMap,
  type AccountErrorMap,
  type AccountFieldKey,
  validateAccountSave,
} from '~/utils/validators/account';
import {
  applyUiTheme,
  preferenceToSelectValue,
  selectValueToPreference,
  syncTheme,
  themePreferenceToApi,
  UI_THEME_SELECT_OPTIONS,
  type UiThemePreference,
} from '~/theme.client';

type AccountSnapshot = {
  username: string;
  displayName: string;
  email: string;
  theme: UiThemePreference;
  createdAt: DayWithTime;
  entitlements: ProductEntitlement[];
};

function formatMemberSince(value: DayWithTime): string {
  const d = dateFromDayWithTimeUtc(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(d);
}

function formatEntitlement(entitlement: ProductEntitlement): string {
  switch (entitlement) {
    case 'BETA_TESTER':
      return 'Beta Tester';
    case 'DEVELOPER':
      return 'Developer';
    case 'NEW_USER':
      return 'New User';
    default:
      return entitlement;
  }
}

function formatAccountType(entitlements: ProductEntitlement[]): string {
  return entitlements.length > 0 ? entitlements.map(formatEntitlement).join(', ') : 'Standard';
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
    <InfoText size="small" variant="error" className={className} id={id} aria-live="polite">
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
  const [draftTheme, setDraftTheme] = useState<UiThemePreference>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
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
    const theme: UiThemePreference =
      res.theme === 'light' || res.theme === 'dark' ? res.theme : null;
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
    syncTheme(theme);
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
        syncTheme(savedRef.current.theme);
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
    syncTheme(saved.theme);
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
        <UnsavedChangesModal
          onKeepEditing={() => closeModalRef.current()}
          onDiscardChanges={() => {
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
      patch.theme = themePreferenceToApi(draftTheme);
    }

    const validationErrors = validateAccountSave({
      username: nextUsername,
      displayName: nextDisplay === '' ? null : nextDisplay,
      email: nextEmail,
      theme: themePreferenceToApi(draftTheme),
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
      syncTheme(draftTheme);

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

  const handleDownloadData = async () => {
    if (!routeUser) return;
    setDownloadBusy(true);
    try {
      const blob = await downloadUserDataCsv(routeUser);
      const href = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `${routeUser}-habsum-data.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(href);
      showToast({ type: 'success', message: 'Data export started.' });
    } catch (e) {
      showToast({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setDownloadBusy(false);
    }
  };

  const loaded = saved != null;

  return (
    <div className="account-page">
      {hasDirty ? (
        <div className="flex justify-space-between">
          <InfoText size="medium" variant="warning" className="account-page__info">
            You have unsaved changes.
          </InfoText>
          <div className="account-page__actions">
            <Button
              type="tertiary"
              text="Cancel"
              disabled={!loaded || saveBusy}
              onClick={revertDrafts}
            />
            <Button
              type="primary"
              text={saveBusy ? 'Saving…' : 'Save'}
              disabled={!loaded || saveBusy || !normDisplay(draftUsername)}
              onClick={() => void handleSave()}
            />
          </div>
        </div>
      ) : null}

      <div className="card card--no-padding">
        <SettingsHeader title="Profile information" />

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
            </div>
          )}
        </div>
      </div>

      {loaded ? (
        <div className="card card--no-padding">
          <SettingsHeader title="Display" />

          <div className="card-padding">
            <div className="account-page__basic">
              <div className="account-page__field">
                <label htmlFor="account-theme" className="account-page__label text-b-m">
                  Theme
                </label>
                <div className="account-page__control">
                  <select
                    id="account-theme"
                    className="account-page__select text-b-m"
                    value={preferenceToSelectValue(draftTheme)}
                    disabled={saveBusy}
                    aria-describedby={
                      saveFieldErrors.theme?.length ? 'account-field-error-theme' : undefined
                    }
                    onChange={(e) => {
                      const t = selectValueToPreference(e.target.value);
                      setDraftTheme(t);
                      applyUiTheme(t);
                      clearSaveFieldError('theme');
                    }}
                  >
                    {UI_THEME_SELECT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
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
          </div>
        </div>
      ) : null}

      {loaded ? (
        <div className="card card--no-padding">
          <SettingsHeader title="Export your habit data" />

          <div className="card-padding">
            <p className="text-light text-b-m">
              Download a CSV of habit daily selections and summation events.
            </p>
            <Button
              type="secondary"
              icon="download"
              text={downloadBusy ? 'Downloading…' : 'Download'}
              disabled={!routeUser || downloadBusy}
              onClick={() => void handleDownloadData()}
            />
          </div>
        </div>
      ) : null}

      {loaded ? (
        <div className="card card--no-padding">
          <SettingsHeader title="Account" />

          <div className="card-padding">
            <div className="account-page__meta-rows">
              <div className="account-page__meta-row">
                <div className="account-page__meta-label text-b-m text-light">Member since</div>
                <div className="account-page__meta-value text-b-m">
                  {formatMemberSince(saved.createdAt)}
                </div>
              </div>
              <div className="account-page__meta-row">
                <div className="account-page__meta-label text-b-m text-light">Account type</div>
                <div className="account-page__meta-value text-b-m">
                  {formatAccountType(saved.entitlements)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {loaded ? (
        <div className="card card--no-padding account-page__danger">
          <SettingsHeader title="Danger zone" titleClassName="text-error" />

          <div className="card-padding account-page__danger-body">
            <p className="text-light text-b-m">
              Delete this user. This removes their config and all stored data. This action cannot be
              undone.
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
        </div>
      ) : null}
    </div>
  );
}
