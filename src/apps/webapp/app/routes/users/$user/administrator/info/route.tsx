// exclusive-bem-block: administrator-info
import { useEffect, useState } from 'react';
import { useRouteLoaderData } from 'react-router';
import type { loader as rootLoader } from '~/root';
import { Button } from '@habsum/ui/components/Button';
import { InfoText } from '@habsum/ui/components/InfoText';
import { Input } from '@habsum/ui/components/Input';
import { Loader } from '@habsum/ui/components/Loader';
import { ModalBody, ModalFooter, ModalHeader, useModal } from '@habsum/ui/contexts/modal';
import { useToast } from '@habsum/ui/contexts/toast';
import { deleteAdministratorDatabase, downloadAdministratorDatabase } from '~/api.client';
import { SettingsPageCard } from '~/components/SettingsPageCard';

const clockFormat: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
};

function formatInstantInZone(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString(undefined, { ...clockFormat, timeZone });
}

function DeleteDatabaseModal({
  databasePath,
  onDeleted,
}: {
  databasePath: string;
  onDeleted: () => void;
}) {
  const { closeModal } = useModal();
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmation !== 'delete' || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdministratorDatabase(confirmation);
      closeModal();
      onDeleted();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete database.');
      setBusy(false);
    }
  };

  return (
    <>
      <ModalHeader dismissDisabled={busy}>Delete database?</ModalHeader>
      <ModalBody>
        <div className="administrator-info__delete-modal-content">
          <p className="text-b-m text-light">
            This permanently deletes the full database at{' '}
            <code className="administrator-info__database-path">{databasePath}</code>, including all
            users, settings, and habit data. This action cannot be undone.
          </p>
          <div className="administrator-info__delete-confirmation">
            <span id="database-delete-confirmation-label" className="text-b-m text-bold">
              Type <strong>delete</strong> to confirm
            </span>
            <Input
              size="small"
              value={confirmation}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              onChange={setConfirmation}
              aria-labelledby="database-delete-confirmation-label"
              aria-describedby={error ? 'database-delete-error' : undefined}
            />
          </div>
          {error ? (
            <InfoText size="small" variant="error" id="database-delete-error">
              {error}
            </InfoText>
          ) : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          type="tertiary"
          color="danger"
          className="mr-1"
          text={busy ? 'Deleting…' : 'Delete database'}
          disabled={confirmation !== 'delete' || busy}
          onClick={() => void handleDelete()}
        />
        <Button type="secondary" text="Cancel" disabled={busy} onClick={closeModal} />
      </ModalFooter>
    </>
  );
}

export default function AdministratorInfo() {
  const rootData = useRouteLoaderData<typeof rootLoader>('root');
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [databaseDeleted, setDatabaseDeleted] = useState(false);
  const [browserNow, setBrowserNow] = useState(() => new Date());
  const { present } = useModal();
  const { showToast } = useToast();

  useEffect(() => {
    const id = window.setInterval(() => setBrowserNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const databaseData = rootData?.application.database ?? null;
  const serverTime = rootData?.application.serverTime ?? null;
  const apiVersion = rootData?.application.apiVersion;

  const downloadDatabase = async () => {
    if (downloadBusy || databaseDeleted) return;
    setDownloadBusy(true);
    try {
      const blob = await downloadAdministratorDatabase();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'habsum.db';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to download database.',
      });
    } finally {
      setDownloadBusy(false);
    }
  };

  const openDeleteDatabaseModal = () => {
    if (!databaseData || databaseDeleted) return;
    present({
      content: (
        <DeleteDatabaseModal
          databasePath={databaseData.path}
          onDeleted={() => {
            setDatabaseDeleted(true);
            showToast({
              type: 'success',
              message: 'Database deleted. Restart Habsum to create a new empty database.',
            });
          }}
        />
      ),
    });
  };

  return (
    <div className="administrator-info">
      <SettingsPageCard
        headerText="Database"
        subtitle="Download the complete SQLite database or permanently delete it."
        className="administrator-info__database"
        actions={
          <Button
            type="secondary"
            icon="download"
            text={downloadBusy ? 'Downloading…' : 'Download database'}
            disabled={!databaseData || downloadBusy || databaseDeleted}
            onClick={() => void downloadDatabase()}
          />
        }
      >
        <div className="card-padding administrator-info__database-content">
          {databaseDeleted ? (
            <InfoText size="medium" variant="warning">
              The database was deleted. Restart Habsum to create a new empty database.
            </InfoText>
          ) : databaseData ? (
            <>
              <dl className="administrator-info__database-list">
                <div className="administrator-info__database-row">
                  <dt className="text-b-m">Configured location</dt>
                  <dd className="administrator-info__database-value text-b-m">
                    <code className="administrator-info__database-path">{databaseData.path}</code>
                  </dd>
                </div>
              </dl>
              <div className="administrator-info__database-danger">
                <div>
                  <div className="text-b-m text-bold text-error">Delete database</div>
                  <div className="text-b-s text-light">
                    Permanently removes all users, settings, and habit data.
                  </div>
                </div>
                <Button
                  type="secondary"
                  color="danger"
                  text="Delete database"
                  onClick={openDeleteDatabaseModal}
                />
              </div>
            </>
          ) : (
            <Loader
              className="administrator-info__loader"
              label="Loading database information"
              size="medium"
            />
          )}
        </div>
      </SettingsPageCard>

      <SettingsPageCard headerText="Time" className="administrator-info__clocks">
        <div className="card-padding">
          <dl className="administrator-info__clock-list">
            <div className="administrator-info__clock-row">
              <dt className="text-b-m">Server (API)</dt>
              <dd className="administrator-info__clock-value text-b-m">
                {serverTime ? (
                  <>
                    <div>{formatInstantInZone(serverTime.iso, serverTime.timezone)}</div>
                    <div className="text-light text-b-s">Time zone: {serverTime.timezone}</div>
                  </>
                ) : (
                  <Loader
                    className="administrator-info__loader"
                    label="Loading server time"
                    size="medium"
                  />
                )}
              </dd>
            </div>
            <div className="administrator-info__clock-row">
              <dt className="text-b-m">This device</dt>
              <dd className="administrator-info__clock-value text-b-m">
                <div>{browserNow.toLocaleString(undefined, clockFormat)}</div>
                <div className="text-light text-b-s">Time zone: {browserZone}</div>
              </dd>
            </div>
          </dl>
        </div>
      </SettingsPageCard>

      <SettingsPageCard headerText="Version" className="administrator-info__version">
        <div className="card-padding">
          {apiVersion ? (
            <dl className="administrator-info__version-list">
              <div className="administrator-info__version-row">
                <dt className="text-b-m">Server</dt>
                <dd className="administrator-info__version-value text-b-m">v{apiVersion}</dd>
              </div>
            </dl>
          ) : (
            <Loader className="administrator-info__loader" label="Loading version" size="medium" />
          )}
        </div>
      </SettingsPageCard>
    </div>
  );
}
