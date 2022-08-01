const ScheduleDate = () => {
  const before = () => {
    let nowDate = new Date();
    let hours = nowDate.getUTCHours();
    let newHours = Math.floor(hours / 4) * 4;

    nowDate.setUTCHours(newHours);
    nowDate.setUTCMinutes(0);
    nowDate.setUTCSeconds(0);

    return nowDate.toISOString();
  }

  const next = () => {
    let nowDate = new Date();
    let hours = nowDate.getUTCHours();
    let newHours = Math.floor(hours / 4) * 4 + 4;

    nowDate.setUTCHours(newHours);
    nowDate.setUTCMinutes(0);
    nowDate.setUTCSeconds(0);

    return nowDate.toISOString();
  }

  return {
    before,
    next
  }
}

export { ScheduleDate };