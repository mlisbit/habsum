import { useEffect } from "react";
import { useParams } from "@remix-run/react";

export default function UserSettingsIndex() {
  const { user } = useParams();
  useEffect(() => {
    window.location.replace(
      `/users/${encodeURIComponent(user ?? "")}/settings/account`
    );
  }, [user]);
  return null;
}
