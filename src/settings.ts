export interface ArtifactsSettings {
  openLinksInNewTab: boolean;
  zoomFactor: number;
  allowFormsAndPopups: boolean;
}

export const DEFAULT_SETTINGS: ArtifactsSettings = {
  openLinksInNewTab: false,
  zoomFactor: 1,
  allowFormsAndPopups: true,
};

function clampZoom(value: unknown): number {
  const num = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(num)) return DEFAULT_SETTINGS.zoomFactor;
  return Math.min(2, Math.max(0.5, num));
}

export function parseSettings(data: unknown): ArtifactsSettings {
  const raw = (data ?? {}) as Partial<Record<keyof ArtifactsSettings, unknown>>;
  return {
    openLinksInNewTab:
      raw.openLinksInNewTab === undefined
        ? DEFAULT_SETTINGS.openLinksInNewTab
        : Boolean(raw.openLinksInNewTab),
    zoomFactor: raw.zoomFactor === undefined ? DEFAULT_SETTINGS.zoomFactor : clampZoom(raw.zoomFactor),
    allowFormsAndPopups:
      raw.allowFormsAndPopups === undefined
        ? DEFAULT_SETTINGS.allowFormsAndPopups
        : Boolean(raw.allowFormsAndPopups),
  };
}
