import { useEffect } from "react";
import { getSelectedUser } from "~/cookies.client";

export default function IndexRoute() {
  useEffect(() => {
    const user = getSelectedUser();
    if (user) window.location.replace(`/users/${encodeURIComponent(user)}/habits`);
    else window.location.replace("/users");
  }, []);

  return null;
}
