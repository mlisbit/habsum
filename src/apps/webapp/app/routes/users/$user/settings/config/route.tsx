import { useParams } from "@remix-run/react";
import { ConfigYamlEditor } from "~/components/ConfigYamlEditor";

export default function UserSettingsConfig() {
  const { user } = useParams();
  if (!user) {
    return <p className="warn text-b-s">Missing user</p>;
  }
  return (
    <div className="card card--no-padding">
      <ConfigYamlEditor user={decodeURIComponent(user)} />
    </div>
  );
}
