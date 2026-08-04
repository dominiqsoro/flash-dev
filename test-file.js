// Test file for flash-dev push - auth improvements
function validateRefreshToken(token) {
  // Add refresh token validation
  if (!token) return false;
  return token.expiresAt > Date.now();
}

function handleJWTExpiration(token) {
  // Improve JWT expiration handling
  if (token.expiresAt < Date.now()) {
    return refreshAccessToken();
  }
  return token;
}
