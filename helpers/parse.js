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

export const getTimestamp = () => {
  return formatTimestamp(new Date());
};

export const formatPrice = (number) => {
  if (number === null || number === undefined || number === 0) return "-";

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
  if (days > 0) {
    result += `${days}d `;
  } else {
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
  }
  result += `ago`;

  return result;
};

export const getAge = (date) => {
  const createdAt = dayjs(date);
  const duration = dayjs.duration(dayjs().diff(createdAt));
  return duration;
};

export const formatHoneypot = (honeypot, tokenAddress) => {
  const isHoneypot = honeypot?.honeypotResult?.isHoneypot;
  const flags = honeypot?.honeypotResult?.flags;
  const rootOpenSource = honeypot?.contractCode?.rootOpenSource;
  const honeypotUrl = `https://honeypot.is/ethereum?address=${tokenAddress}`;

  let result = ``;

  if (!rootOpenSource) {
    result += `Contract: ❗️Closed source\n`;
  }

  result += `Honeypot: `;
  if (isHoneypot === false) {
    result += `<a href="${honeypotUrl}">Low risk</a>`;
    return result;
  }

  if (isHoneypot === true) {
    if (flags?.length > 0) {
      result += `<a href="${honeypotUrl}">⚠️Potential</a>`;
    } else {
      result += `<a href="${honeypotUrl}">⚠️YES</a>`;
    }
    return result;
  }

  result += `<a href="${honeypotUrl}">Unknown</a>`;
  return result;
};

export const formatTaxString = (honeypot) => {
  if (honeypot === null || honeypot === undefined) return "Tax: -";

  const buyTax = formatPercentage(honeypot.simulationResult?.buyTax);
  const sellTax = formatPercentage(honeypot.simulationResult?.sellTax);
  const transferTax = formatPercentage(honeypot.simulationResult?.transferTax);

  return `Tax: Buy ${buyTax} | Sell ${sellTax} | Transfer ${transferTax}`;
};

const formatPercentage = (tax) => {
  if (tax === null || tax === undefined) return "-";
  return `${tax.toFixed(0)}%`;
};
