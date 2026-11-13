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
  // patterns + elliott waves
  xabcd: S(P('M4 18l5-11 5 8 4-9 6 12') + P('M9 7l5 8M4 18l10-3M14 15l4-9', DASH) + D(4, 18, 1.8) + D(9, 7, 1.8) + D(14, 15, 1.8) + D(18, 6, 1.8) + D(24, 18, 1.8)),
  cypher: S(P('M4 20l6-12 5 9 5-12 4 6') + P('M10 8l5 9M4 20l11-3', DASH) + D(4, 20, 1.8) + D(10, 8, 1.8) + D(15, 17, 1.8) + D(20, 5, 1.8) + D(24, 11, 1.8)),
  hnsh: S(P('M3 19l3-6 3 5 3.2-11 3.2 11 3-5 3.5 6') + P('M3 18.2h22', DASH) + D(3, 19, 1.5) + D(12.2, 7, 1.5) + D(25, 19, 1.5)),
  abcd: S(P('M4 21l7-13 6 9 7-12') + P('M4 21l13-4M11 8l13 1', DASH) + D(4, 21, 1.8) + D(11, 8, 1.8) + D(17, 17, 1.8) + D(24, 5, 1.8)),
  trip: S(P('M4 22l5-15 6 11 4-9 5 8') + P('M4 22l17-4M9 7l15 11', DASH) + D(4, 22, 1.8) + D(9, 7, 1.8) + D(15, 18, 1.8) + D(19, 9, 1.8)),
  drives: S(P('M3 21l3-8 2 4 3-10 2 5 3-9 2 5 4-8') + D(3, 21, 1.5) + D(11, 7, 1.5) + D(16, 5, 1.5) + D(25, 6, 1.5)),
  eimp: S(P('M3 22l4-9 3 4 5-12 3 8 4-6') + D(3, 22, 1.7) + D(7, 13, 1.5) + D(15, 5, 1.5) + D(25, 7, 1.5)),
  ecor: S(P('M3 8l8 11 4-6 9 10') + D(3, 8, 1.7) + D(11, 19, 1.7) + D(15, 13, 1.7) + D(24, 23, 1.7)),
  etri: S(P('M3 17l4-9 4 12 4-9 3 6 3-3') + D(3, 17, 1.6) + D(7, 8, 1.4) + D(11, 20, 1.4) + D(25, 20, 1.4)),
  edbl: S(P('M3 20l5-11 4 8 4-5 6 8') + D(3, 20, 1.7) + D(8, 9, 1.6) + D(12, 17, 1.6) + D(22, 20, 1.6)),
  etrp: S(P('M3 21l4-9 3 5 4-9 3 6 3-5 5 8') + D(3, 21, 1.6) + D(7, 12, 1.4) + D(10, 17, 1.4) + D(25, 21, 1.4)),
  patmenu: S(P('M4 21l5-11 5 9 5-13 4 8') + D(4, 21, 1.8) + D(9, 10, 1.8) + D(14, 19, 1.8) + D(19, 6, 1.8) + D(23, 14, 1.8)),
  // gann + cycles
  gbox: S('<rect x="5" y="5" width="18" height="18" rx="1"/>' + P('M5 5l18 18M23 5L5 23M5 14h18M14 5v18', ' stroke-width="1.2"') + D(5, 5, 1.8) + D(23, 23, 1.8)),
  gsqf: S('<rect x="5" y="5" width="18" height="18" rx="1"/>' + P('M5 11h18M5 17h18M11 5v18M17 5v18', ' stroke-width="1.1"') + P('M5 5l18 18', ' stroke-width="1.4"') + D(5, 5, 1.8)),
  gsq: S('<rect x="6" y="6" width="16" height="16" rx="1"/>' + P('M6 6l16 16M22 6L6 22M6 14h16M14 6v16', ' stroke-width="1.1"') + D(6, 6, 1.8) + D(22, 22, 1.8)),
  gfan: S(P('M5 23L24 4M5 23L24 10M5 23L24 16M5 23L24 22M5 23L16 4M5 23L10 4') + D(5, 23, 2.2)),
  cyc: S(P('M5 4v20M11 4v20M17 4v20M23 4v20', DASH) + D(5, 14, 1.8) + D(11, 14, 1.8)),
  tcyc: S(P('M3 20a5.5 5.5 0 0111 0M14 20a5.5 5.5 0 0111 0M3 20h22', '') + D(3, 20, 1.8) + D(14, 20, 1.8)),
  sine: S(P('M3 14c3-12 8-12 11 0s8 12 11 0') + D(3, 14, 1.8) + D(14, 14, 1.8)),
  gnmenu: S('<rect x="5" y="5" width="18" height="18" rx="1"/>' + P('M5 5l18 18M23 5L5 23', ' stroke-width="1.2"') + D(5, 5, 1.8) + D(23, 23, 1.8)),
  // volume-based + projection extras
  avwap: S(P('M4 21l5-4 4 2 4-7 4 1 3-6') + D(4, 21, 1.9) + P('M4 8v10', DASH)),
  fvp: S(P('M5 5h8v3H5zM5 9.5h14v3H5zM5 14h10v3H5zM5 18.5h6v3H5z', ' stroke-width="1.3"') + P('M5 3v21', '')),
  fcast: S(P('M5 21L22 8M22 8l-5.2.6M22 8l-1.6 5') + D(5, 21, 2) + P('M5 21h17', DASH)),
  bpat: S(P('M7 6v14M7 9h0M5 10h4v6H5z', ' stroke-width="1.3"') + P('M15 4v13M13 7h4v7h-4z', ' stroke-width="1.3"') + P('M20.5 9v12M19 12h3v6h-3z', ' stroke-width="1.3"') + D(4, 22, 1.6)),
  ghost: S(P('M6 7v13M4.2 10h3.6v6H4.2z', ' stroke-width="1.3"') + P('M13 4v13M11.2 7h3.6v7h-3.6z', ' stroke-width="1.3"' + DASH) + P('M20 9v12M18.2 12h3.6v6h-3.6z', ' stroke-width="1.3"' + DASH)),
  proj: S(P('M5 21l6-9') + P('M14 14l6-9') + P('M5 21l9-7M11 12l9-7', DASH) + D(5, 21, 1.9) + D(11, 12, 1.9) + D(14, 14, 1.9)),
  ruler: S('<rect x="3" y="10" width="22" height="8.5" rx="1.6" transform="rotate(-38 14 14)"/>' + P('M9 17.4l1.8 1.5M12.4 14.8l1.8 1.5M15.8 12.2l1.8 1.5')),
};
