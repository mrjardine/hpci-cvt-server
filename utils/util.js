const isBoolean = (value) => {
  return !isNil(value) && (value === false || value === true);
};

const isNil = (value) => {
  return typeof value === 'undefined' || value === null;
};

module.exports = {
  isBoolean,
  isNil
};
