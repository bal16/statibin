import { useCallback, useState } from "react";
import { useRoute } from "./hooks/useRoute";
import { CreatePage } from "../pages/CreatePage";
import { ReadPage } from "../pages/ReadPage";

export default function App() {
  const route = useRoute();
  const [forkText, setForkText] = useState("");

  const onFork = useCallback((text: string) => {
    setForkText(text);
    window.location.hash = "";
  }, []);

  if (route.name === "view") return <ReadPage key={route.hash} hash={route.hash} onFork={onFork} />;
  return <CreatePage key={forkText} initialText={forkText} />;
}
