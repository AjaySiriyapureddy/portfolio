import { ModuleFn, ModuleMeta } from "./base";
import * as corsCheck from "./corsCheck";
import * as jwtAudit from "./jwtAudit";
import * as ssrfProbe from "./ssrfProbe";
import * as idorProbe from "./idorProbe";
import * as techFingerprint from "./techFingerprint";
import * as subdomainTakeoverCheck from "./subdomainTakeoverCheck";
import * as sqliProbe from "./sqliProbe";
import * as xssProbe from "./xssProbe";
import * as sstiProbe from "./sstiProbe";
import * as openRedirectProbe from "./openRedirectProbe";
import * as pathTraversalProbe from "./pathTraversalProbe";
import * as securityHeadersAudit from "./securityHeadersAudit";
import * as massAssignmentProbe from "./massAssignmentProbe";
import * as xxeProbe from "./xxeProbe";
import * as rateLimitProbe from "./rateLimitProbe";
import * as fileUploadProbe from "./fileUploadProbe";
import * as roleMatrixProbe from "./roleMatrixProbe";

interface ModuleEntry {
  meta: ModuleMeta;
  run: ModuleFn;
}

const REGISTRY: Record<string, ModuleEntry> = {
  [corsCheck.meta.id]: corsCheck,
  [jwtAudit.meta.id]: jwtAudit,
  [ssrfProbe.meta.id]: ssrfProbe,
  [idorProbe.meta.id]: idorProbe,
  [techFingerprint.meta.id]: techFingerprint,
  [subdomainTakeoverCheck.meta.id]: subdomainTakeoverCheck,
  [sqliProbe.meta.id]: sqliProbe,
  [xssProbe.meta.id]: xssProbe,
  [sstiProbe.meta.id]: sstiProbe,
  [openRedirectProbe.meta.id]: openRedirectProbe,
  [pathTraversalProbe.meta.id]: pathTraversalProbe,
  [securityHeadersAudit.meta.id]: securityHeadersAudit,
  [massAssignmentProbe.meta.id]: massAssignmentProbe,
  [xxeProbe.meta.id]: xxeProbe,
  [rateLimitProbe.meta.id]: rateLimitProbe,
  [fileUploadProbe.meta.id]: fileUploadProbe,
  [roleMatrixProbe.meta.id]: roleMatrixProbe,
};

export function getModule(moduleId: string): ModuleEntry | null {
  return REGISTRY[moduleId] ?? null;
}

export function listModules(): ModuleMeta[] {
  return Object.values(REGISTRY)
    .map((m) => m.meta)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export type { ModuleFn, ModuleMeta } from "./base";
