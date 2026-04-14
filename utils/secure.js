const CryptoJS = require('./crypto-js.js');
const GLOBAL_RESPONSE_KEY = 'sygav9Iec4kZiRvivnwSVe3iWq66cTCleo8gr3qL2GyXTcQHXJ1E57ZqfhqfIyWp70Imy0rJ7ZkS5SI4T0asRQ==';

function splitKey(responseKey) {
  const keyHex = CryptoJS.enc.Base64.parse(responseKey).toString(CryptoJS.enc.Hex);
  return {
    cipherKey: CryptoJS.enc.Hex.parse(keyHex.slice(0, 64)),
    macKey: CryptoJS.enc.Hex.parse(keyHex.slice(64, 128))
  };
}

function verifyMac(macKey, payload) {
  const signContent = `${payload.iv}.${payload.ciphertext}`;
  const mac = CryptoJS.HmacSHA256(signContent, macKey).toString(CryptoJS.enc.Base64);
  return mac === payload.mac;
}

function decryptPayload(responseKey, payload) {
  const finalKey = responseKey || GLOBAL_RESPONSE_KEY;
  if (!finalKey || !payload || !payload.iv || !payload.ciphertext || !payload.mac) {
    return payload;
  }

  const { cipherKey, macKey } = splitKey(finalKey);
  if (!verifyMac(macKey, payload)) {
    throw new Error('响应验签失败');
  }

  const plain = CryptoJS.AES.decrypt(
    { ciphertext: CryptoJS.enc.Base64.parse(payload.ciphertext) },
    cipherKey,
    {
      iv: CryptoJS.enc.Base64.parse(payload.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  ).toString(CryptoJS.enc.Utf8);

  return JSON.parse(plain || 'null');
}

module.exports = {
  decryptPayload
};
