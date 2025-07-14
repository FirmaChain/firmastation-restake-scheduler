export const NextScheduleDate = () => {
  const nowDate = new Date();
  const hours = nowDate.getUTCHours();
  const newHours = Math.floor(hours / 4) * 4 + 4;

  nowDate.setUTCHours(newHours);
  nowDate.setUTCMinutes(0);
  nowDate.setUTCSeconds(0);

  return nowDate.toISOString();
};
