/**
 * 微信小程序 - 打印模板渲染工具
 * 专门用于将 TSPL 或 ESC/POS 模板中的占位符替换为真实业务数据
 */

/**
 * 模板渲染核心方法
 * @param {String} template 模板字符串，例如: 'TEXT 20,30,"TSS24.BF2",0,1,1,"型号: {modelCode}"'
 * @param {Object} data 真实数据对象，例如: { modelCode: 'FZ-8001', meters: 120 }
 * @returns {String} 渲染后的最终指令字符串
 */
function renderTemplate(template, data) {
  if (!template) return '';
  if (!data || typeof data !== 'object') return template;

  // 使用正则匹配所有的 {key} 占位符
  // 正则解释：\{ 匹配左括号，([^}]+) 匹配中间的变量名，\} 匹配右括号
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    // 去除 key 前后的空格，允许你在模板里写 { modelCode } 或 {modelCode}
    const trimmedKey = key.trim();
    
    // 从 data 对象中取值
    const value = data[trimmedKey];
    
    // 关键防御：如果找不到对应的值，替换为空字符串，而不是打出 "undefined" 或 "null"
    return (value !== undefined && value !== null) ? String(value) : '';
  });
}

module.exports = {
  renderTemplate
};