import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the pg pool so the promote transaction logic can be tested without a
// database (CI has no Postgres service). The client script is asserted
// call-by-call: BEGIN → INSERT..SELECT → (status check) → UPDATE → SELECT →
// COMMIT, with ROLLBACK on failure.
const query = vi.fn();
const release = vi.fn();

vi.mock("./db.js", () => ({
  pool: {
    connect: async () => ({ query, release }),
    query,
  },
}));

const { promoteRouteSuggestion } = await import("./routes.js");
const { HttpError } = await import("./http.js");

const moderator = { id: "mod-1" } as never;

const routeRow = {
  id: "route-1",
  name: "Symonds Yat to Monmouth",
  river_name_text: "River Wye",
  route_type: "whitewater-section",
  river_id: "river-wye",
  status: "published",
  evidence_status: "community-reported",
  grade: "Grade 2",
  summary: "A summary.",
  access_summary: "Access notes.",
  conditions_summary: null,
  route: { type: "LineString", coordinates: [[-2.73, 52.07], [-2.72, 52.05]] },
  geometry_source: "member-trace",
  distance_km: "2.1",
  source_route_suggestion_id: "sugg-1",
  created_at: new Date("2026-07-02T10:00:00Z"),
  updated_at: new Date("2026-07-02T10:00:00Z"),
  revision: "1",
  submitted_by_name: "Paddler 6678",
  promoted_by_name: "Mod Name",
};

function callsOf(mock: ReturnType<typeof vi.fn>) {
  return mock.mock.calls.map((call) => String(call[0]).trim().split(/\s+/)[0]);
}

describe("promoteRouteSuggestion", () => {
  beforeEach(() => {
    query.mockReset();
    release.mockReset();
  });

  it("promotes an approved suggestion in one transaction and returns the route", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT status FROM route_suggestions")) {
        return { rowCount: 1, rows: [{ status: "approved" }] };
      }
      if (sql.startsWith("INSERT INTO routes")) {
        return { rowCount: 1, rows: [{ id: "route-1" }] };
      }
      if (sql.trim().startsWith("UPDATE route_suggestions")) {
        return { rowCount: 1, rows: [] };
      }
      if (sql.trim().startsWith("SELECT")) {
        return { rowCount: 1, rows: [routeRow] };
      }
      return { rowCount: 0, rows: [] };
    });

    const route = await promoteRouteSuggestion("sugg-1", moderator);

    expect(route.id).toBe("route-1");
    expect(route.riverId).toBe("river-wye");
    expect(route.status).toBe("published");
    expect(route.route).toEqual([
      [52.07, -2.73],
      [52.05, -2.72],
    ]);
    expect(route.attribution).toEqual({
      submittedBy: "Paddler 6678",
      promotedBy: "Mod Name",
    });

    const verbs = callsOf(query);
    expect(verbs[0]).toBe("BEGIN");
    expect(verbs.at(-1)).toBe("COMMIT");
    expect(verbs).not.toContain("ROLLBACK");
    // The suggestion is flipped to 'promoted' inside the same transaction.
    const updateCall = query.mock.calls.find((call) =>
      String(call[0]).includes("SET status = 'promoted'"),
    );
    expect(updateCall).toBeDefined();
    expect(release).toHaveBeenCalledOnce();
  });

  it("rejects a non-approved suggestion with 409 and rolls back", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith("INSERT INTO routes")) {
        // WHERE rs.status = 'approved' matched nothing.
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes("SELECT status FROM route_suggestions")) {
        return { rowCount: 1, rows: [{ status: "pending_review" }] };
      }
      return { rowCount: 0, rows: [] };
    });

    await expect(promoteRouteSuggestion("sugg-1", moderator)).rejects.toMatchObject({
      status: 409,
    });
    expect(callsOf(query)).toContain("ROLLBACK");
    expect(callsOf(query)).not.toContain("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("rejects an unknown suggestion with 404 and rolls back", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith("INSERT INTO routes")) {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes("SELECT status FROM route_suggestions")) {
        return { rowCount: 0, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    });

    const promoted = promoteRouteSuggestion("missing", moderator);
    await expect(promoted).rejects.toBeInstanceOf(HttpError);
    await expect(
      promoteRouteSuggestion("missing", moderator),
    ).rejects.toMatchObject({ status: 404 });
  });
});
