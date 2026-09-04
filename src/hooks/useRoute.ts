import { useEffect, useState } from "react";

export type Route = { name: "create" } | { name: "view"; hash: string };

export function getRoute(): Route {
  return window.location.hash.length > 1
    ? { name: "view", hash: window.location.hash }
    : { name: "create" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return route;
}
