import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Map } from "./map.tsx";

import "./index.scss";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Map
      centerLng={37.62223524930375}
      centerLtd={55.75374851787201}
      defaultZoom={12}
    />
  </StrictMode>
);
