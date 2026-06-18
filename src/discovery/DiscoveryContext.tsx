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
import {
  fetchSectionObservations,
  type SectionObservationMeasure,
} from "../services/observationApi";
import type { ObservationRangeHours } from "../appCore";
import type { MapPoi } from "../types";

interface DiscoveryContextValue {
  rivers: CanonicalRiverSummary[];
  riversError: string | null;
  selectedRiverId: string | null;
  selectedRiver: CanonicalRiverDetail | null;
  riverPois: MapPoi[];
  riverObservations: SectionObservationMeasure[];
  riverObservationRange: ObservationRangeHours;
  setRiverObservationRange: (hours: ObservationRangeHours) => void;
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
  const [riverObservations, setRiverObservations] = useState<
    SectionObservationMeasure[]
  >([]);
  const [riverObservationRange, setRiverObservationRange] =
    useState<ObservationRangeHours>(48);
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
      setRiverObservations([]);
      return;
    }

    let active = true;
    setIsRiverLoading(true);

    void (async () => {
      try {
        const river = await fetchCanonicalRiver(selectedRiverId);
        if (!active) return;
        setSelectedRiver(river);

        const pois = await fetchRiverMapPois(selectedRiverId).catch(
          () => [] as MapPoi[],
        );
        if (!active) return;
        setRiverPois(pois);
      } catch {
        if (active) {
          setSelectedRiver(null);
          setRiverPois([]);
          setRiverObservations([]);
        }
      } finally {
        if (active) {
          setIsRiverLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedRiverId]);

  // Re-fetch the selected river's gauge history when the river or the chosen
  // range (48h / 7d / 28d) changes.
  useEffect(() => {
    if (!selectedRiver) {
      setRiverObservations([]);
      return;
    }

    let active = true;
    const sectionIds = selectedRiver.sectionLinks.map((link) => link.sectionId);
    void Promise.all(
      sectionIds.map((sectionId) =>
        fetchSectionObservations(sectionId, riverObservationRange).catch(
          () => [] as SectionObservationMeasure[],
        ),
      ),
    ).then((groups) => {
      if (active) {
        setRiverObservations(groups.flat());
      }
    });

    return () => {
      active = false;
    };
  }, [selectedRiver, riverObservationRange]);

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
        riverObservations,
        riverObservationRange,
        setRiverObservationRange,
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
