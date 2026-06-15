import { useEffect, useState } from "react";
import { Waves } from "lucide-react";
import type { PaddleLog } from "../types";
import { fetchPaddleLogs } from "../services/paddleLogApi";

interface RiverPaddleHistoryProps {
  riverId: string;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Personal river history (PROFILE-F2). Self-contained: it simply tries to load
// the signed-in member's logs for this river; if the viewer is signed out the
// fetch rejects and the component renders nothing.
export function RiverPaddleHistory({ riverId }: RiverPaddleHistoryProps) {
  const [logs, setLogs] = useState<PaddleLog[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    fetchPaddleLogs(riverId)
      .then((result) => {
        if (active) {
          setLogs(result);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setLogs([]);
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [riverId]);

  if (!ready || logs.length === 0) {
    return null;
  }

  const last = logs[0];

  return (
    <div className="river-paddle-history">
      <Waves size={15} />
      <div>
        <strong>
          You have paddled this{" "}
          {logs.length === 1 ? "once" : `${logs.length} times`}
        </strong>
        <span>
          Last on {formatDate(last.paddledOn)}
          {last.levelNote ? ` · ${last.levelNote}` : ""}
        </span>
      </div>
    </div>
  );
}
