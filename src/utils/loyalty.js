export const POINTS_SPEND_UNIT = 10000; // so'm spent per 1 point earned
export const POINT_VALUE = 50; // so'm discount per 1 point redeemed

export function earnedPoints(amount) {
  return Math.floor(Math.max(0, amount) / POINTS_SPEND_UNIT);
}

export function discountForPoints(points) {
  return Math.max(0, points) * POINT_VALUE;
}
