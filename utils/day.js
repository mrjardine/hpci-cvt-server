const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

const isAfterDaysAgo = (date, days) => {
  return dayjs
    .utc(date)
    .isAfter(dayjs.utc().startOf('day').subtract(days, 'day'));
};

const isBeforeAnHourAgo = (date) => {
  return dayjs.utc(date).isBefore(dayjs.utc().subtract(1, 'hour'));
};

const now = (local = false) => {
  if (local) {
    return dayjs.utc().local().format(); // 2019-03-06T12:11:55+03:00
  } else {
    return dayjs.utc().format(); // 2019-03-06T09:11:55Z
  }
};

module.exports = {
  isAfterDaysAgo,
  isBeforeAnHourAgo,
  now
};
