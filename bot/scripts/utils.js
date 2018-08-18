/* eslint-disable no-restricted-globals */
const numberformat = (value) => {
  if (typeof value === 'number') {
    if (value === 0) return 0;
    const reg = /(^[+-]?\d+)(\d{3})/;
    let n = `${value} `;
    while (reg.test(n)) {
      n = n.replace(reg, '$1,$2');
    }
    return n.trim();
  } 
  
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return numberformat(num);
  }
  return 0;
};

exports.numberformat = numberformat;
