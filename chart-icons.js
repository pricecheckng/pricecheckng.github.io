// Drawing-tool icons for the chart page. One style for all: 28 grid, thin round lines,
// small open circles where you tap a point (like the point handles on the chart itself).
const S = (b) => '<svg width="24" height="24" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + b + '</svg>';
const P = (d, extra) => '<path d="' + d + '"' + (extra || '') + '/>';
const D = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 2.2) + '"/>';
const F = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 2) + '" fill="currentColor" stroke="none"/>';
const DASH = ' stroke-dasharray="2 2.6"';
export const ICONS = {
  // cursors
  cur_cross: S(P('M14 4v7M14 17v7M4 14h7M17 14h7')),
  cur_dot: S(F(14, 14, 3.4)),
  cur_arrow: S(P('M8 5l12 7.5-5.2 1.4L12.2 20 8 5z')),
  cur_eraser: S(P('M9.5 21H21M5.2 15.8l8.3-8.6a1.6 1.6 0 012.3 0l4.3 4.4a1.6 1.6 0 010 2.3L14.6 21H10l-4.8-4.9a1.6 1.6 0 010-2.3z') + P('M10 11.4l6.7 6.7')),
  // lines
  trend: S(P('M7.6 20.4L20.4 7.6') + D(6, 22) + D(22, 6)),
  ray: S(P('M7.6 20.4L25 3') + D(6, 22) + D(15, 13)),
  info: S(P('M7.6 18.4L19.4 6.6') + D(6, 20) + D(21, 5) + P('M15 20.5h8a1.5 1.5 0 011.5 1.5v0a1.5 1.5 0 01-1.5 1.5h-8a1.5 1.5 0 01-1.5-1.5v0a1.5 1.5 0 011.5-1.5z')),
  extended: S(P('M3 25L25 3') + D(10, 18) + D(18, 10)),
  angle: S(P('M5.5 22H24') + P('M6.7 20.6L20.4 8.4') + D(5, 22) + D(22, 7) + P('M13 22a8 8 0 00-2-5.2', DASH)),
  hline: S(P('M3 14h8.2M16.8 14H25') + D(14, 14)),
  hray: S(P('M8.2 14H25') + D(6, 14)),
  vline: S(P('M14 3v8.2M14 16.8V25') + D(14, 14)),
  cross: S(P('M3 14h8.2M16.8 14H25M14 3v8.2M14 16.8V25') + D(14, 14)),
  // channels
  pchan: S(P('M6.6 17.4L18.4 6.6') + D(5, 19) + D(20, 5) + P('M9.6 24.4L25 10') + D(16, 18, 2)),
  regr: S(P('M4 19L24 9') + P('M4 12L24 2', DASH) + P('M4 26L24 16', DASH) + D(4, 19, 1.8) + D(24, 9, 1.8)),
  flat: S(P('M7 8h15') + P('M6.8 20.2L20.4 9.4') + D(5, 22) + D(22, 8) + D(5, 8)),
  djoint: S(P('M6.6 17.4L18.6 6.4') + D(5, 19) + D(20, 5) + P('M10 24.2L25 15') + D(8.4, 25.2, 2) + D(26, 14.4, 1.4)),
  // pitchforks
  pitch: S(P('M7 21L24 4M6 11.5L15 3M16 25l9-9') + P('M6 11.5L16 25', DASH) + D(5, 22) + D(6, 11.5, 1.8) + D(16, 25, 1.8)),
  schiff: S(P('M9.6 17.4L25 2M6 11.5L15 3M16 25l9-9') + P('M6 11.5L16 25', DASH) + D(8, 19, 2) + D(6, 11.5, 1.8) + D(16, 25, 1.8)),
  mschiff: S(P('M11.6 14.4L25 1M6 11.5L15 3M16 25l9-9') + P('M6 11.5L16 25', DASH) + D(10, 16, 2) + D(6, 11.5, 1.8) + D(16, 25, 1.8)),
  inpitch: S(P('M7 21L24 4M7 14.5L14 7.5M14 23.5l8-8') + P('M6 11.5L16 25', DASH) + D(5, 22) + D(6, 11.5, 1.8) + D(16, 25, 1.8)),
  // fibonacci
  fib: S(P('M9 6h16M9 11h16M9 17h16M9 22h16') + P('M5.4 20L5.4 8', DASH) + D(5.4, 22, 2) + D(5.4, 6, 2)),
  fibext: S(P('M6 21l5.4-9.6L16.4 17') + P('M18 7h8M18 12h8M18 22h8') + D(5, 22.4, 1.9) + D(12, 10.6, 1.9) + D(17.6, 18, 1.9)),
  fibch: S(P('M6.8 19.6L19.8 7.4M9.4 25L25 11M3.4 14L14 4.6') + D(5.4, 21, 2) + D(21.4, 6, 2)),
  fibtz: S(P('M12 5v18M16 5v18M21 5v18M26 5v18') + P('M5.4 18V9', DASH) + D(5.4, 20.4, 2) + D(5.4, 6.6, 2)),
  fibfan: S(P('M7 21L25 4M7 21L25 10M7 21L25 15.5M7 21L25 21M7 21L14.5 3') + D(5.4, 22.4, 2)),
  fibtime: S(P('M13 6v17M17 6v17M22 6v17') + P('M4 21l4-9 4.6 7', DASH) + D(4, 21.5, 1.9) + D(8, 11.5, 1.9) + D(12.4, 19, 1.9)),
  fibcirc: S('<circle cx="14" cy="14" r="3.2"/><circle cx="14" cy="14" r="6.8"/><circle cx="14" cy="14" r="10.6"/>'),
  fibspiral: S(P('M14 14a2 2 0 011.6-1.4 3.6 3.6 0 011.8 3.6 6.4 6.4 0 01-5.6 5.8A10.2 10.2 0 013.8 12.6 16 16 0 0120 3') + D(14, 14, 1.4)),
  fibarcs: S(P('M4 22a10 10 0 0120 0M8 22a6 6 0 0112 0M12 22a2.6 2.6 0 015 0') + D(14, 22.4, 1.6)),
  fibwedge: S(P('M5 23L24 6M5 23L25 17') + P('M10.5 18.2a8 8 0 013 3.2M16 13.6a12 12 0 014.4 6.8M21 9.4a16 16 0 015.4 8.4') + D(5, 23, 2)),
  pitchfan: S(P('M5 22L25 4M5 22L25 10M5 22L25 16M5 22L25 22') + D(5, 22, 2.2) + D(25, 4, 1.4) + D(25, 22, 1.4)),
  // projection + measurer
  longpos: S('<rect x="5" y="4.5" width="18" height="8" rx="1" fill="currentColor" fill-opacity=".16"/><rect x="5" y="12.5" width="18" height="11" rx="1"/>' + D(5, 12.5, 1.8) + D(23, 4.5, 1.8)),
  shortpos: S('<rect x="5" y="15.5" width="18" height="8" rx="1" fill="currentColor" fill-opacity=".16"/><rect x="5" y="4.5" width="18" height="11" rx="1"/>' + D(5, 15.5, 1.8) + D(23, 23.5, 1.8)),
  prange: S(P('M6 5h16M6 23h16M14 7.4v13.2M11 10.2L14 7.2l3 3M11 17.8L14 20.8l3-3')),
  drange: S(P('M5 6v16M23 6v16M7.4 14h13.2M10.2 11L7.2 14l3 3M17.8 11l3 3-3 3')),
  dprange: S('<rect x="5" y="5" width="18" height="18" rx="1.2"/>' + P('M14 7.4v13.2M7.4 14h13.2M11.6 10L14 7.4l2.4 2.6M20.6 11.6L23 14l-2.4 2.4', ' stroke-width="1.3"')),
  ruler: S('<rect x="3" y="10" width="22" height="8.5" rx="1.6" transform="rotate(-38 14 14)"/>' + P('M9 17.4l1.8 1.5M12.4 14.8l1.8 1.5M15.8 12.2l1.8 1.5')),
};
