// DEV ONLY entry for dev.html.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { M3Preview } from "./M3Preview";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <M3Preview />
  </StrictMode>,
);
