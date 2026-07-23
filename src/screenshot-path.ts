/** `<dir>/<basename>-screenshots/<timestamp>.png` next to the source file —
 *  mirrors the folder convention Mario already uses by hand in Resources/_artifacts/. */
export function screenshotOutputPath(sourcePath: string, timestamp: string): string {
  const lastSlash = sourcePath.lastIndexOf('/');
  const dir = lastSlash === -1 ? '' : sourcePath.slice(0, lastSlash + 1);
  const filename = lastSlash === -1 ? sourcePath : sourcePath.slice(lastSlash + 1);
  const basename = filename.replace(/\.(html?|htm)$/i, '');
  return `${dir}${basename}-screenshots/${timestamp}.png`;
}
