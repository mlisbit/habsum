import { useParams } from "@remix-run/react";
import { ConfigYamlEditor } from "~/components/ConfigYamlEditor";

export default function UserSettingsConfig() {
  const { user } = useParams();
  if (!user) {
    return <p className="warn">Missing user</p>;
  }
  return <ConfigYamlEditor user={decodeURIComponent(user)} />;
}
