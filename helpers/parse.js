import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

export const parseDate = (utcTimeString) => {
  const [year, month, day, hour, minute, second] = utcTimeString.split(/[- :]/);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
};

export const utcToSgt = (utcDate) => {
  const offset = 8;
  const sgtDate = new Date(utcDate.getTime() + offset * 60 * 60 * 1000);
  return sgtDate;
};

export const parsePrice = (number) => {
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

export const parseValue = (number) => {
  if (number === null || number === undefined) return "-";
  return number.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export const getAgeString = (date) => {
  if (!date) return "-";

  const createdAt = dayjs(date);
  const duration = dayjs.duration(dayjs().diff(createdAt));

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
