import { useCallback, useState } from "react";
import { useRoute } from "./hooks/useRoute";
import { CreatePage } from "./screens/CreatePage";
import { ReadPage } from "./screens/ReadPage";

export default function App() {
  const route = useRoute();
  const [forkText, setForkText] = useState("");

  const onFork = useCallback((text: string) => {
    setForkText(text);
    window.location.hash = "";
  }, []);

  if (route.name === "view") return <ReadPage hash={route.hash} onFork={onFork} />;
  return <CreatePage key={forkText} initialText={forkText} />;
}
