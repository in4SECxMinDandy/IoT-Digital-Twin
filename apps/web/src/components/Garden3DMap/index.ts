// Re-export Garden3DMap with React.lazy for code splitting
import { lazy } from "react";

export const Garden3DMap = lazy(() => import("./Garden3DMap").then(module => ({ default: module.Garden3DMap })));
