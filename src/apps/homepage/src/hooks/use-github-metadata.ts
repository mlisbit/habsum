import { useEffect, useState } from 'react';
import getGithubMetadata, { type GithubMetadata } from '../utils/get-github-metadata';

export default function useGithubMetadata() {
  const [metadata, setMetadata] = useState<GithubMetadata>({ stars: null, release: null });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    void getGithubMetadata(controller.signal).then((data) => {
      window.clearTimeout(timeout);
      if (active) setMetadata(data);
    });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return metadata;
}
