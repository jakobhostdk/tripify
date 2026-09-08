/**
 * Shared map geometry. The world is drawn in a 1000×500 equirectangular
 * viewBox where 1° = 1000/360 SVG units in both axes.
 */

export const WORLD_W = 1000;
export const WORLD_H = 500;
export const DEG_PER_UNIT = 360 / WORLD_W; // = 0.36
export const UNITS_PER_DEG = WORLD_W / 360; // = 2.7777…

export function project(lat: number, lon: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * WORLD_W,
    y: ((90 - lat) / 180) * WORLD_H,
  };
}

/**
 * Compute an SVG viewBox attribute string framing a region centered at (lat, lon)
 * with a half-width of `radiusDeg` longitude degrees. Latitude is given the same
 * angular span (so the box is roughly square in degrees, though equirectangular
 * stretching means it will skew at high latitudes — we accept that for v1).
 */
export function regionViewBox(
  lat: number,
  lon: number,
  radiusDeg: number,
): string {
  const { x, y } = project(lat, lon);
  const half = radiusDeg * UNITS_PER_DEG;
  const x0 = x - half;
  const y0 = y - half;
  const size = half * 2;
  return `${x0.toFixed(2)} ${y0.toFixed(2)} ${size.toFixed(2)} ${size.toFixed(2)}`;
}

/**
 * Hand-drawn simplified continent silhouettes. Not cartographically accurate,
 * but read recognizably as Earth at world scale and continue to behave well
 * when cropped to a region.
 */
export const CONTINENT_PATHS: readonly string[] = [
  // North America
  `M 55 78 C 78 62, 130 56, 178 58 C 232 56, 280 62, 308 75
   C 322 90, 322 118, 308 138 C 295 152, 285 165, 280 182
   C 272 198, 255 200, 240 198 C 226 196, 215 205, 222 220
   C 232 238, 246 252, 252 265 C 252 272, 245 272, 240 268
   C 226 260, 215 246, 208 232 C 198 218, 180 212, 165 200
   C 145 188, 122 175, 105 158 C 88 142, 70 122, 60 105
   C 55 92, 53 84, 55 78 Z`,
  // Greenland
  `M 355 38 C 370 30, 388 32, 398 42 C 408 55, 405 72, 395 82
   C 382 88, 368 84, 360 75 C 352 65, 350 50, 355 38 Z`,
  // South America
  `M 272 250 C 290 245, 312 252, 326 268 C 338 285, 342 308, 338 330
   C 332 358, 322 385, 312 405 C 302 422, 290 432, 282 428
   C 274 418, 268 400, 266 380 C 264 355, 270 328, 274 305
   C 274 285, 272 268, 272 250 Z`,
  // Europe (mainland)
  `M 458 88 C 472 80, 492 80, 510 84 C 528 88, 540 96, 543 110
   C 540 124, 528 134, 512 138 C 495 140, 478 138, 466 132
   C 454 124, 450 110, 452 100 C 452 94, 455 90, 458 88 Z`,
  // Britain
  `M 487 102 C 492 96, 498 95, 502 100 C 504 108, 502 118, 496 124
   C 490 128, 485 124, 484 116 C 484 110, 484 104, 487 102 Z`,
  // Scandinavia
  `M 514 65 C 522 60, 532 60, 540 66 C 545 76, 542 86, 535 92
   C 528 96, 520 92, 516 84 C 512 76, 511 70, 514 65 Z`,
  // Africa
  `M 485 152 C 510 148, 540 152, 562 168 C 578 185, 580 215, 572 245
   C 562 275, 548 300, 530 320 C 518 332, 506 335, 498 328
   C 490 318, 488 298, 490 278 C 492 255, 490 232, 486 212
   C 480 192, 478 172, 482 158 C 482 154, 483 152, 485 152 Z`,
  // Madagascar
  `M 590 285 C 595 280, 600 282, 602 290 C 604 302, 600 314, 595 318
   C 590 316, 588 308, 588 298 C 588 292, 588 287, 590 285 Z`,
  // Asia mainland
  `M 542 80 C 580 70, 630 65, 680 65 C 730 65, 780 70, 820 80
   C 855 92, 875 110, 878 132 C 872 158, 855 170, 830 174
   C 805 178, 780 174, 760 178 C 750 188, 752 202, 745 215
   C 735 225, 720 228, 702 222 C 690 215, 685 200, 690 186
   C 692 175, 685 168, 670 165 C 645 158, 620 152, 600 146
   C 580 138, 558 128, 548 112 C 540 100, 538 88, 542 80 Z`,
  // India peninsula
  `M 668 168 C 680 175, 688 188, 690 205 C 688 220, 680 228, 672 226
   C 664 220, 660 205, 662 188 C 663 178, 666 170, 668 168 Z`,
  // Arabian peninsula
  `M 590 168 C 605 168, 618 175, 620 188 C 618 200, 608 208, 598 208
   C 588 205, 582 195, 584 182 C 585 174, 587 170, 590 168 Z`,
  // SE Asia archipelago
  `M 786 215 C 800 213, 814 218, 820 228 C 820 238, 810 244, 798 242
   C 788 238, 780 230, 780 222 C 780 218, 783 215, 786 215 Z`,
  `M 822 232 C 832 230, 842 233, 845 240 C 844 246, 836 250, 828 248
   C 822 244, 818 238, 822 232 Z`,
  // Japan
  `M 870 130 C 878 128, 884 134, 886 142 C 886 154, 880 162, 874 162
   C 870 158, 868 148, 868 138 C 868 134, 868 131, 870 130 Z`,
  // Australia
  `M 822 318 C 850 308, 882 312, 905 322 C 920 332, 920 350, 905 360
   C 882 368, 855 370, 832 365 C 818 360, 812 348, 815 335
   C 816 325, 819 320, 822 318 Z`,
  // New Zealand
  `M 933 370 C 940 370, 944 376, 942 384 C 938 388, 932 386, 930 380
   C 930 374, 931 371, 933 370 Z`,
  `M 945 388 C 950 388, 952 392, 950 396 C 946 398, 943 396, 943 392
   C 943 390, 944 388, 945 388 Z`,
  // Antarctica
  `M 0 446 C 80 432, 160 436, 240 432 C 320 430, 400 430, 480 432
   C 560 434, 640 432, 720 432 C 800 432, 880 430, 1000 446
   L 1000 500 L 0 500 Z`,
];
