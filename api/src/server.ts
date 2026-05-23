import { createServer } from "node:http";
import type { IncomingHttpHeaders } from "node:http";
import {
  getOptionalAuthContext,
  requireAuthContext,
} from "./auth.js";
import { getPort } from "./config.js";
import { listContributionsForSection } from "./contributions.js";
import { closePool, pool } from "./db.js";
import { HttpError, readJsonBody, sendJson } from "./http.js";
import {
  listMembersForAdmin,
  requireAdmin,
  upsertMemberFromAuth,
} from "./members.js";
import { pushSyncOperations } from "./sync.js";

async function route(
  requestUrl: string,
  method: string,
  headers: IncomingHttpHeaders,
  body: unknown,
): Promise<{ status: number; body: unknown }> {
  const url = new URL(requestUrl, "http://localhost");

  if (method === "GET" && url.pathname === "/api/health") {
    const db = await pool.query("SELECT 1 AS ok");

    return {
      status: 200,
      body: {
        ok: true,
        database: db.rows[0].ok === 1 ? "ok" : "unknown",
      },
    };
  }

  if (method === "GET" && url.pathname === "/api/me") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    return { status: 200, body: { member } };
  }

  if (method === "GET" && url.pathname === "/api/admin/members") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    requireAdmin(member);
    const members = await listMembersForAdmin();
    return { status: 200, body: { members } };
  }

  const sectionContributionsMatch = url.pathname.match(
    /^\/api\/sections\/([^/]+)\/contributions$/,
  );
  if (method === "GET" && sectionContributionsMatch) {
    const authContext = await getOptionalAuthContext(headers);
    const member = authContext ? await upsertMemberFromAuth(authContext) : null;
    const contributions = await listContributionsForSection(
      decodeURIComponent(sectionContributionsMatch[1]),
      member?.id ?? null,
    );
    return { status: 200, body: { contributions } };
  }

  if (method === "POST" && url.pathname === "/api/sync/push") {
    const authContext = await requireAuthContext(headers);
    const member = await upsertMemberFromAuth(authContext);
    const result = await pushSyncOperations(body, {
      firebaseUid: authContext.userId,
      memberId: member.id,
    });
    return { status: result.failed.length ? 207 : 200, body: result };
  }

  throw new HttpError(404, "Not found");
}

export function createApiServer() {
  return createServer(async (request, response) => {
    try {
      const body = request.method === "POST" ? await readJsonBody(request) : {};
      const result = await route(
        request.url ?? "/",
        request.method ?? "GET",
        request.headers,
        body,
      );
      sendJson(response, result);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : "Internal server error";
      sendJson(response, { status, body: { error: message } });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = getPort();
  const server = createApiServer();

  server.listen(port, () => {
    console.log(`River Go API listening on http://127.0.0.1:${port}`);
  });

  process.on("SIGTERM", () => {
    server.close(() => {
      closePool().finally(() => process.exit(0));
    });
  });
}
