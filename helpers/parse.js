import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

export const parseUtcTimeString = (utcTimeString) => {
  const [year, month, day, hour, minute, second] = utcTimeString.split(/[- :]/);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
};

export const formatTimestamp = (date) => {
  if (!date) return "-";
  return date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Singapore",
    hour12: false, // Use 24-hour time format
    hour: "2-digit", // 2-digit hour representation
    minute: "2-digit", // 2-digit minute representation
    second: "2-digit", // 2-digit second representation (optional)
  });
};

export const formatPrice = (number) => {
  if (number === null || number === undefined) return "-";

  if (number >= 10) {
    return number.toPrecision(4);
  }

  if (number >= 1) {
    return number.toPrecision(4);
  }

  if (number >= 0.1) {
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }

  if (number >= 0.01) {
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 5,
      maximumFractionDigits: 5,
    });
  }

  // Convert the number to scientific notation first to easily extract parts
  let scientificNotation = number.toExponential();
  let [base, exponent] = scientificNotation
    .split("e")
    .map((part) => parseFloat(part, 10));

  let zerosNeeded = Math.abs(exponent) - 1; // Subtract 1 to account for the digit before the decimal

  // Construct the custom format
  let formattedNumber = `0.0(${zerosNeeded})${base
    .toFixed(3)
    .replace(".", "")}`;
  return formattedNumber;
};

export const formatValue = (number) => {
  if (number === null || number === undefined) return "-";
  return number.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const getRelativeDate = (date) => {
  if (!date) return "-";

  const duration = getAge(date);

  const days = Math.floor(duration.asDays());
  const hours = duration.hours();
  const minutes = duration.minutes();

  let result = ``;
  if (days > 0) result += `${days} ${days > 1 ? "days" : "day"} `;
  if (hours > 0) result += `${hours} ${hours > 1 ? "hours" : "hour"} `;
  if (days === 0 && minutes > 0)
    result += `${minutes} ${minutes > 1 ? "minutes" : "minute"} `;
  result += `ago`;

  return result;
};

export const getAge = (date) => {
  const createdAt = dayjs(date);
  const duration = dayjs.duration(dayjs().diff(createdAt));
  return duration;
};
