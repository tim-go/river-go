import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCanonicalRiver,
  fetchCanonicalRivers,
  type CanonicalRiverDetail,
  type CanonicalRiverSummary,
} from "../services/canonicalRiverApi";
import { fetchRiverMapPois } from "../services/mapPoiApi";
import type { MapPoi } from "../types";

interface DiscoveryContextValue {
  rivers: CanonicalRiverSummary[];
  riversError: string | null;
  selectedRiverId: string | null;
  selectedRiver: CanonicalRiverDetail | null;
  riverPois: MapPoi[];
  isRiverLoading: boolean;
  selectRiver: (riverId: string | null) => void;
}

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null);

/**
 * Owns the discovery surface's state: the canonical river list, the current
 * selection, and the selected river's detail + promoted POIs. The map and the
 * RiverCard both read from this rather than threading App()'s state.
 */
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const [rivers, setRivers] = useState<CanonicalRiverSummary[]>([]);
  const [riversError, setRiversError] = useState<string | null>(null);
  const [selectedRiverId, setSelectedRiverId] = useState<string | null>(null);
  const [selectedRiver, setSelectedRiver] =
    useState<CanonicalRiverDetail | null>(null);
  const [riverPois, setRiverPois] = useState<MapPoi[]>([]);
  const [isRiverLoading, setIsRiverLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCanonicalRivers()
      .then((loaded) => {
        if (active) {
          setRivers(loaded);
          setRiversError(null);
        }
      })
      .catch((error) => {
        if (active) {
          setRiversError(
            error instanceof Error ? error.message : "Could not load rivers.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedRiverId) {
      setSelectedRiver(null);
      setRiverPois([]);
      return;
    }

    let active = true;
    setIsRiverLoading(true);
    void Promise.all([
      fetchCanonicalRiver(selectedRiverId),
      fetchRiverMapPois(selectedRiverId).catch(() => [] as MapPoi[]),
    ])
      .then(([river, pois]) => {
        if (active) {
          setSelectedRiver(river);
          setRiverPois(pois);
        }
      })
      .catch(() => {
        if (active) {
          setSelectedRiver(null);
          setRiverPois([]);
        }
      })
      .finally(() => {
        if (active) {
          setIsRiverLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedRiverId]);

  const selectRiver = useCallback((riverId: string | null) => {
    setSelectedRiverId(riverId);
  }, []);

  return (
    <DiscoveryContext.Provider
      value={{
        rivers,
        riversError,
        selectedRiverId,
        selectedRiver,
        riverPois,
        isRiverLoading,
        selectRiver,
      }}
    >
      {children}
    </DiscoveryContext.Provider>
  );
}

export function useDiscovery() {
  const value = useContext(DiscoveryContext);
  if (!value) {
    throw new Error("useDiscovery must be used within a DiscoveryProvider.");
  }
  return value;
}
