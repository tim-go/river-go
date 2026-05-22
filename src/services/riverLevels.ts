import { wyeEnvironmentAgencyGaugeMappings } from "../data/wyeGaugeMappings";
import type { LiveGaugeReading, RiverSection } from "../types";

interface EaReadingResponse {
  items?: Array<{
    dateTime?: string;
    value?: number;
  }>;
}

function buildFallback(section: RiverSection, message: string): LiveGaugeReading {
  return {
    sectionId: section.id,
    gauge: {
      provider: "environment-agency",
      providerStationId: section.gauge.id,
      providerMeasureId: "",
      name: section.gauge.name,
      latestValue: null,
      unit: "",
      trend: "unknown",
      observedAt: null,
      sourceUrl: "",
    },
    interpretation: {
      band: section.levelBand,
      confidence: "seed fallback",
    },
    state: "fallback",
    message,
  };
}

export async function fetchEnvironmentAgencyGaugeReading(
  section: RiverSection,
): Promise<LiveGaugeReading> {
  const mapping = wyeEnvironmentAgencyGaugeMappings[section.id];

  if (!mapping) {
    return {
      ...buildFallback(
        section,
        "No Environment Agency measure has been mapped for this section yet.",
      ),
      state: "unmapped",
    };
  }

  const readingsUrl = `${mapping.sourceUrl}/readings?latest`;

  try {
    const response = await fetch(readingsUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return buildFallback(
        section,
        `Environment Agency lookup failed with HTTP ${response.status}.`,
      );
    }

    const data = (await response.json()) as EaReadingResponse;
    const latest = data.items?.[0];

    if (typeof latest?.value !== "number") {
      return buildFallback(
        section,
        "Environment Agency returned no latest reading for the mapped measure.",
      );
    }

    return {
      sectionId: section.id,
      gauge: {
        provider: "environment-agency",
        providerStationId: mapping.providerStationId,
        providerMeasureId: mapping.providerMeasureId,
        name: mapping.providerName,
        latestValue: latest.value,
        unit: mapping.unit,
        trend: "unknown",
        observedAt: latest.dateTime ?? null,
        sourceUrl: mapping.sourceUrl,
      },
      interpretation: {
        band: "unknown",
        confidence: mapping.confidence,
      },
      state: "live",
      message:
        "Live EA reading loaded. Section interpretation still needs local validation.",
    };
  } catch {
    return {
      ...buildFallback(
        section,
        "Environment Agency lookup failed; showing seed/demo gauge context.",
      ),
      state: "error",
    };
  }
}
