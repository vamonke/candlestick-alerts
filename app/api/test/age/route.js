import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";
import duration from "dayjs/plugin/duration";

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.extend(duration);

dayjs.updateLocale("en", {
  relativeTime: {
    future: "in %s",
    past: "%s ago",
    s: "a few seconds",
    m: "1 minute",
    mm: "%d minutes",
    h: "1 hour",
    hh: "%d hours",
    d: "1 day",
    dd: "%d days",
    M: "1 month",
    MM: "%d months",
    y: "1 year",
    yy: "%d years",
  },
});

export async function GET(req) {
  const createdAt = dayjs("2024-02-28T08:13:47.000Z");
  var duration = dayjs.duration(dayjs().diff(createdAt));
  // .format("D[d] H[h] m[m] [ago]");

  const days = Math.floor(duration.asDays());
  const hours = duration.hours();
  const minutes = duration.minutes();

  let result = ``;
  if (days > 0) result += `${days} ${days > 1 ? "days" : "day"} `;
  if (hours > 0) result += `${hours} ${hours > 1 ? "hours" : "hour"} `;
  if (days === 0 && minutes > 0) result += `${minutes} minutes `;
  result += `ago`;

  return new Response(
    JSON.stringify({
      result,
    })
  );
}
