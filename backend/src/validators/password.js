/**
 * Merkezi şifre doğrulama kuralları.
 * Tüm controller'lar bu modülü kullanır — tutarsızlık olmaz.
 *
 * Kurallar:
 *   - En az 8 karakter
 *   - En az 1 büyük harf (A-Z)
 *   - En az 1 küçük harf (a-z)
 *   - En az 1 rakam veya özel karakter
 */

const MIN_LENGTH = 8;
const HAS_UPPER  = /[A-Z]/;
const HAS_LOWER  = /[a-z]/;
const HAS_DIGIT_OR_SPECIAL = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

function validatePassword(password) {
  if (!password || password.length < MIN_LENGTH) {
    return 'Şifre en az 8 karakter olmalıdır.';
  }
  if (!HAS_UPPER.test(password)) {
    return 'Şifre en az bir büyük harf içermelidir.';
  }
  if (!HAS_LOWER.test(password)) {
    return 'Şifre en az bir küçük harf içermelidir.';
  }
  if (!HAS_DIGIT_OR_SPECIAL.test(password)) {
    return 'Şifre en az bir rakam veya özel karakter içermelidir.';
  }
  return null; // null → geçerli
}

module.exports = { validatePassword };
