/** Default ETA: three calendar days from now at 17:00 local (server timezone). */
export function defaultEstimatedDeliveryFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(17, 0, 0, 0);
  return d;
}

/** True once the full calendar day of the estimated delivery has ended (server local timezone). */
export function isPastDeliveryDay(estimatedDeliveryDate) {
  if (!estimatedDeliveryDate) return false;
  const est = new Date(estimatedDeliveryDate);
  const end = new Date(est.getFullYear(), est.getMonth(), est.getDate(), 23, 59, 59, 999);
  return Date.now() > end.getTime();
}

const AUTO_DELIVER_STATUSES = ["PROCESSING", "READY", "RECEIVED"];

/**
 * Marks orders DELIVERED when their delivery calendar day has passed (still PROCESSING/READY/RECEIVED).
 * Not wired to any HTTP route — bulk auto-updates fought manual status edits on old orders. Call from a
 * cron or admin script if you want this behaviour.
 */
export async function syncAutoDeliveredOrders(prisma) {
  const candidates = await prisma.order.findMany({
    where: {
      status: { in: AUTO_DELIVER_STATUSES },
      estimatedDeliveryDate: { not: null },
    },
    select: { id: true, estimatedDeliveryDate: true },
  });
  const ids = candidates.filter((o) => isPastDeliveryDay(o.estimatedDeliveryDate)).map((o) => o.id);
  if (!ids.length) return 0;
  const r = await prisma.order.updateMany({
    where: { id: { in: ids } },
    data: { status: "DELIVERED" },
  });
  return r.count;
}

