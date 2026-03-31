// /utils/template.js
module.exports = `
SIZE 60 mm, 40 mm
GAP 2 mm, 0 mm
DIRECTION 1
CLS
TEXT 100, 60, "TSS24.BF2", 0, 2, 2, "生产厂家：XX有限责任公司"
TEXT 50, 130, "TSS24.BF2", 0, 1, 1, "型号：{modelCode}    米数：{meters} m"
TEXT 50, 190, "TSS24.BF2", 0, 1, 1, "规格：{spec}    日期：2025-10-1"
BARCODE 150, 260, "128", 60, 1, 0, 2, 3, "{barcode}"
PRINT 1,1
`;