import type { OutputId, OutputStatusValue } from '@vmcr/shared';
import { OUTPUT_COLORS, ACTIVE_COLOR } from '@vmcr/shared';

interface SourceButtonOptions {
  name: string;
  outputId: OutputId;
  isActive: boolean;
  thumbnailBase64?: string;
}

interface StatusButtonOptions {
  outputId: OutputId;
  label: string;
  sourceName: string;
  status: OutputStatusValue;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '\u2026';
}

export function renderSourceButton(options: SourceButtonOptions): string {
  const { name, outputId, isActive, thumbnailBase64 } = options;
  const borderColor = OUTPUT_COLORS[outputId];
  const activeRing = isActive ? `<rect x="2" y="2" width="140" height="140" rx="8" ry="8" fill="none" stroke="${ACTIVE_COLOR}" stroke-width="4"/>` : '';

  const thumbnailContent = thumbnailBase64
    ? `<image x="16" y="14" width="112" height="84" href="data:image/png;base64,${thumbnailBase64}" preserveAspectRatio="xMidYMid slice" clip-path="url(#thumb-clip)"/>`
    : `<rect x="16" y="14" width="112" height="84" rx="4" ry="4" fill="#555"/>
       <text x="72" y="60" font-family="Arial,sans-serif" font-size="12" fill="#aaa" text-anchor="middle" dominant-baseline="middle">No Preview</text>`;

  const displayName = escapeXml(truncate(name, 14));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <defs>
    <clipPath id="thumb-clip">
      <rect x="16" y="14" width="112" height="84" rx="4" ry="4"/>
    </clipPath>
  </defs>
  <rect width="144" height="144" rx="12" ry="12" fill="#1a1a1a"/>
  <rect x="4" y="4" width="136" height="136" rx="10" ry="10" fill="none" stroke="${borderColor}" stroke-width="3"/>
  ${activeRing}
  ${thumbnailContent}
  <rect x="0" y="102" width="144" height="42" rx="0" ry="0" fill="rgba(0,0,0,0.7)"/>
  <text x="72" y="110" font-family="Arial,sans-serif" font-size="9" fill="${borderColor}" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${outputId === 'A' ? 'OUTPUT A' : 'OUTPUT B'}</text>
  <text x="72" y="130" font-family="Arial,sans-serif" font-size="13" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${displayName}</text>
</svg>`;
}

export function renderStatusButton(options: StatusButtonOptions): string {
  const { outputId, label, sourceName, status } = options;
  const borderColor = OUTPUT_COLORS[outputId];
  const statusColor =
    status === 'active' ? ACTIVE_COLOR : status === 'error' ? '#F44336' : '#666';
  const displayName = escapeXml(truncate(sourceName, 14));
  const displayLabel = escapeXml(label);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="12" ry="12" fill="#1a1a1a"/>
  <rect x="4" y="4" width="136" height="136" rx="10" ry="10" fill="none" stroke="${borderColor}" stroke-width="3"/>
  <circle cx="72" cy="36" r="8" fill="${statusColor}"/>
  <text x="72" y="70" font-family="Arial,sans-serif" font-size="11" fill="${borderColor}" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${displayLabel}</text>
  <text x="72" y="95" font-family="Arial,sans-serif" font-size="14" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${displayName}</text>
  <text x="72" y="120" font-family="Arial,sans-serif" font-size="10" fill="#aaa" text-anchor="middle" dominant-baseline="middle">${status === 'active' ? 'LIVE' : status === 'error' ? 'ERROR' : 'IDLE'}</text>
</svg>`;
}

export function renderErrorButton(message: string): string {
  const displayMessage = escapeXml(truncate(message, 18));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="12" ry="12" fill="#1a1a1a"/>
  <rect x="4" y="4" width="136" height="136" rx="10" ry="10" fill="none" stroke="#F44336" stroke-width="3"/>
  <text x="72" y="60" font-family="Arial,sans-serif" font-size="24" fill="#F44336" text-anchor="middle" dominant-baseline="middle">&#x26A0;</text>
  <text x="72" y="95" font-family="Arial,sans-serif" font-size="12" fill="white" text-anchor="middle" dominant-baseline="middle">${displayMessage}</text>
</svg>`;
}

export function renderLoadingButton(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="12" ry="12" fill="#1a1a1a"/>
  <text x="72" y="72" font-family="Arial,sans-serif" font-size="12" fill="#aaa" text-anchor="middle" dominant-baseline="middle">Loading...</text>
</svg>`;
}
