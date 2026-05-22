export interface EnvironmentAgencyGaugeMapping {
  sectionId: string;
  providerStationId: string;
  providerMeasureId: string;
  providerName: string;
  unit: string;
  sourceUrl: string;
  confidence: "candidate-needs-validation" | "mapped";
}

const lydbrookLevelMeasure = {
  providerStationId: "2320",
  providerMeasureId: "2320-level-stage-i-15_min-mASD",
  providerName: "Lydbrook LVL",
  unit: "mASD",
  sourceUrl:
    "https://environment.data.gov.uk/flood-monitoring/id/measures/2320-level-stage-i-15_min-mASD",
  confidence: "candidate-needs-validation" as const,
};

export const wyeEnvironmentAgencyGaugeMappings: Record<
  string,
  EnvironmentAgencyGaugeMapping
> = {
  "wye-ross-kerne": {
    sectionId: "wye-ross-kerne",
    ...lydbrookLevelMeasure,
  },
  "wye-kerne-symonds-yat": {
    sectionId: "wye-kerne-symonds-yat",
    ...lydbrookLevelMeasure,
  },
  "wye-symonds-yat-monmouth": {
    sectionId: "wye-symonds-yat-monmouth",
    ...lydbrookLevelMeasure,
  },
};
