package cc.hakserver.tv.data.auth

import cc.hakserver.tv.core.JwtUtils
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * @brief Renews the access token shortly before it expires, while logged in.
 * @details The Kotlin analog of the web's useTokenRefresh, and — like the web —
 *          necessarily proactive: /auth/refresh needs a still-valid token, so we
 *          renew *before* expiry, never after a 401. collectLatest restarts the
 *          wait whenever the token changes (a fresh login or our own refresh), so
 *          it self-reschedules; a null token (logout) simply parks it.
 */
class TokenRefresher(
    private val tokenStore: TokenStore,
    private val authApi: AuthApi,
    private val scope: CoroutineScope,
) {
    fun start() = scope.launch {
        tokenStore.tokenFlow.collectLatest { token ->
            if (token == null) return@collectLatest
            val delayMs = JwtUtils.expiryMs(token) - System.currentTimeMillis() - REFRESH_MARGIN_MS
            if (delayMs > 0) delay(delayMs)
            try {
                tokenStore.save(authApi.refresh().accessToken)
            } catch (e: Exception) {
                tokenStore.clear() // renewal failed → session gone → back to login
            }
        }
    }

    private companion object { const val REFRESH_MARGIN_MS = 2 * 60 * 1000L }
}