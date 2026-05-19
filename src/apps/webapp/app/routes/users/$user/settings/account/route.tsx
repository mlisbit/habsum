// exclusive-bem-block: account-page
import { useBlocker, useParams } from '@remix-run/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  changeUserPassword,
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
import { applyUiTheme, UI_THEME_OPTIONS } from '~/theme.client';

type ThemeOption = (typeof UI_THEME_OPTIONS)[number];

type AccountSnapshot = {
  username: string;
  displayName: string;
  email: string;
  theme: ThemeOption;
};

function normDisplay(s: string): string {
  return s.trim();
}

function normEmail(s: string): string {
  return s.trim().toLowerCase();
}

function isPlausibleEmailLocal(value: string): boolean {
  const t = normEmail(value);
  if (t === '') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export default function UserSettingsAccount() {
  const { user: routeUser } = useParams();
  const [saved, setSaved] = useState<AccountSnapshot | null>(null);
  const [draftUsername, setDraftUsername] = useState('');
  const [draftDisplay, setDraftDisplay] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftTheme, setDraftTheme] = useState<ThemeOption>('dark');
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
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
    const snap: AccountSnapshot = { username: routeUser, displayName: display, email, theme };
    setSaved(snap);
    setDraftUsername(routeUser);
    setDraftDisplay(display);
    setDraftEmail(email);
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
    const onlyCurrentPasswordFilled =
      pwdCurrent.trim() !== '' && pwdNew.trim() === '' && pwdConfirm.trim() === '';
    const passwordDirty =
      !onlyCurrentPasswordFilled &&
      (pwdCurrent.trim() !== '' || pwdNew.trim() !== '' || pwdConfirm.trim() !== '');
    return (
      normDisplay(draftUsername) !== normDisplay(saved.username) ||
      normDisplay(draftDisplay) !== normDisplay(saved.displayName) ||
      normEmail(draftEmail) !== normEmail(saved.email) ||
      draftTheme !== saved.theme ||
      passwordDirty
    );
  }, [saved, draftUsername, draftDisplay, draftEmail, draftTheme, pwdCurrent, pwdNew, pwdConfirm]);

  const newPasswordMatchFeedback = useMemo((): 'success' | 'error' | null => {
    const next = pwdNew.trim();
    const again = pwdConfirm.trim();
    if (next === '' || again === '') return null;
    return next === again ? 'success' : 'error';
  }, [pwdNew, pwdConfirm]);

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
    setDraftEmail(saved.email);
    setDraftTheme(saved.theme);
    applyUiTheme(saved.theme);
    setPwdCurrent('');
    setPwdNew('');
    setPwdConfirm('');
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
      showToast({ type: 'error', message: 'Username cannot be empty.' });
      return;
    }

    const nextDisplay = normDisplay(draftDisplay);
    const nextEmail = normEmail(draftEmail);
    if (nextEmail !== '' && !isPlausibleEmailLocal(nextEmail)) {
      showToast({ type: 'error', message: 'Enter a valid email or leave the field empty.' });
      return;
    }

    const patch: UsersPatchRequest = {};
    if (nextUsername !== saved.username) {
      patch.name = nextUsername;
    }
    const savedDisplayNorm = normDisplay(saved.displayName);
    if (nextDisplay !== savedDisplayNorm) {
      patch.displayName = nextDisplay === '' ? null : nextDisplay;
    }
    if (nextEmail !== normEmail(saved.email)) {
      patch.email = nextEmail === '' ? null : nextEmail;
    }
    if (draftTheme !== saved.theme) {
      patch.theme = draftTheme;
    }

    const passwordDirty =
      pwdCurrent.trim() !== '' || pwdNew.trim() !== '' || pwdConfirm.trim() !== '';
    if (passwordDirty) {
      const cur = pwdCurrent.trim();
      const next = pwdNew.trim();
      const again = pwdConfirm.trim();
      if (!cur || !next || !again) {
        showToast({
          type: 'error',
          message: 'Fill in all password fields to change your password, or clear those fields.',
        });
        return;
      }
      if (next !== again) {
        showToast({ type: 'error', message: 'New password and confirmation do not match.' });
        return;
      }
    }

    if (Object.keys(patch).length === 0 && !passwordDirty) return;

    setSaveBusy(true);
    const curPin = pwdCurrent.trim();
    const newPin = pwdNew.trim();
    try {
      let userForPassword = routeUser;

      if (Object.keys(patch).length > 0) {
        const res = await patchUser(routeUser, patch);
        userForPassword = res.user;
        if (res.user !== routeUser) {
          if (passwordDirty) {
            await changeUserPassword(res.user, { currentPin: curPin, newPin });
          }
          window.location.assign(`/users/${encodeURIComponent(res.user)}/settings/account`);
          return;
        }
        const nextSnap: AccountSnapshot = {
          username: res.user,
          displayName: nextDisplay,
          email: nextEmail,
          theme: draftTheme,
        };
        setSaved(nextSnap);
        setDraftUsername(res.user);
        setDraftDisplay(nextDisplay);
        setDraftEmail(nextEmail);
        setDraftTheme(draftTheme);
        applyUiTheme(draftTheme);
      }

      if (passwordDirty) {
        await changeUserPassword(userForPassword, { currentPin: curPin, newPin });
        setPwdCurrent('');
        setPwdNew('');
        setPwdConfirm('');
      }

      showToast({ type: 'success', message: 'Saved.' });
    } catch (e) {
      showToast({
        type: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaveBusy(false);
    }
  };

  const loaded = saved != null;

  return (
    <div className="account-page">
      <SettingsHeader
        title="Account"
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
        <div className="account-page__profile">
          {!loaded ? (
            <p className="text-light text-b-m">Loading…</p>
          ) : (
            <>
              <div className="account-page__basic">
                <h3 className="account-page__basic-heading text-h-s" id="account-basic-info">
                  Basic account information
                </h3>
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
                      onChange={setDraftEmail}
                      placeholder="Optional"
                      dismissable
                      submittable={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="email"
                      inputMode="email"
                      disabled={saveBusy}
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
                </div>
              </div>

              <hr className="account-page__divider" />

              <div className="account-page__password">
                <h3
                  className="account-page__password-heading text-h-s"
                  id="account-change-password"
                >
                  Change password
                </h3>
                <div className="account-page__field">
                  <label
                    htmlFor="account-current-password"
                    className="account-page__label text-b-m"
                  >
                    Current password
                  </label>
                  <div className="account-page__control">
                    <Input
                      id="account-current-password"
                      size="small"
                      className="account-page__profile-input"
                      type="password"
                      value={pwdCurrent}
                      onChange={setPwdCurrent}
                      placeholder="Required"
                      dismissable
                      submittable={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="current-password"
                      disabled={saveBusy}
                    />
                  </div>
                </div>
                <div className="account-page__field">
                  <label htmlFor="account-new-password" className="account-page__label text-b-m">
                    New password
                  </label>
                  <div className="account-page__control">
                    <Input
                      id="account-new-password"
                      size="small"
                      className="account-page__profile-input"
                      type="password"
                      value={pwdNew}
                      onChange={setPwdNew}
                      placeholder="Required"
                      dismissable
                      submittable={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="new-password"
                      disabled={saveBusy}
                      aria-describedby={
                        newPasswordMatchFeedback ? 'account-password-match-hint' : undefined
                      }
                    />
                    {newPasswordMatchFeedback === 'success' ? (
                      <InfoText
                        variant="success"
                        className="account-page__password-match-info"
                        id="account-password-match-hint"
                        aria-live="polite"
                      >
                        Passwords match.
                      </InfoText>
                    ) : newPasswordMatchFeedback === 'error' ? (
                      <InfoText
                        variant="error"
                        className="account-page__password-match-info"
                        id="account-password-match-hint"
                        aria-live="polite"
                      >
                        Passwords do not match.
                      </InfoText>
                    ) : null}
                  </div>
                </div>
                <div className="account-page__field">
                  <label
                    htmlFor="account-confirm-password"
                    className="account-page__label text-b-m"
                  >
                    Confirm new password
                  </label>
                  <div className="account-page__control">
                    <Input
                      id="account-confirm-password"
                      size="small"
                      className="account-page__profile-input"
                      type="password"
                      value={pwdConfirm}
                      onChange={setPwdConfirm}
                      placeholder="Required"
                      dismissable
                      submittable={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="new-password"
                      disabled={saveBusy}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

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
      </div>
    </div>
  );
}
