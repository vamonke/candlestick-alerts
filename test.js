const parsePrice = (number) => {
  if (number >= 10) {
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

  if (number >= 0.001) {
    return number.toLocaleString(undefined, {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    });
  }

  // Convert the number to scientific notation first to easily extract parts
  let scientificNotation = number.toExponential();
  let [base, exponent] = scientificNotation
    .split("e")
    .map((part) => parseFloat(part, 10));

  let zerosNeeded = Math.abs(exponent) - 1; // Subtract 1 to account for the digit before the decimal

  // console.log({
  //   scientificNotation,
  //   base,
  //   exponent,
  //   // adjustedBase,
  //   zerosNeeded,
  // });

  // Construct the custom format
  let formattedNumber = `0.0(${zerosNeeded})${base
    .toFixed(3)
    .replace(".", "")}`;
  return formattedNumber;
};

console.log(parsePrice(78912.3));
console.log(parsePrice(7891.2));
console.log(parsePrice(789.12));
console.log(parsePrice(78.912));
console.log(parsePrice(7.8912));
console.log(parsePrice(0.78912));
console.log(parsePrice(0.078912));
console.log(parsePrice(0.0078912));
console.log(parsePrice(0.00078912));
console.log(parsePrice(0.000078912));
console.log(parsePrice(0.0000078912));
