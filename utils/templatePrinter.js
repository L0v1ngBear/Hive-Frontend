/**
 * 微信小程序 - 打印模板渲染工具
 * 支持 {modelCode} 和 ${modelCode} 两种占位符格式。
 */
function renderTemplate(template, data) {
  if (!template) return '';
  if (!data || typeof data !== 'object') return template;

  const replaceValue = (match, key) => {
    const trimmedKey = String(key || '').trim();
    const value = data[trimmedKey];
    return value !== undefined && value !== null ? String(value) : '';
  };

  return template
    .replace(/\$\{([^}]+)\}/g, replaceValue)
    .replace(/\{([^}]+)\}/g, replaceValue);
}

module.exports = {
  renderTemplate
};