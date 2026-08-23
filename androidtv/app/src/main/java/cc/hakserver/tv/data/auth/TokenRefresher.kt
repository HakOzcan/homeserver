package cc.hakserver.tv.data.auth

import android.util.Log
import cc.hakserver.tv.core.JwtUtils
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * @brief Keeps a logged-in session alive by renewing the access token while it is
 *        still comfortably valid — a frequent heartbeat, NOT a single long timer.
 * @details Ports the web client's proven useTokenRefresh design. The old version
 *          slept once for ~(lifetime − 2min) and refreshed on wake; on a TV that
 *          single timer is routinely deferred by screen-off / background / Doze past
 *          the token's expiry, so it woke with a DEAD token, the refresh 401'd, and
 *          the user was logged out "after a while". Instead, we wake every
 *          CHECK_INTERVAL and renew as soon as the token is within REFRESH_WINDOW of
 *          expiry, so a delayed or missed tick is harmless — there are ~15 chances
 *          inside the window.
 *
 *          We deliberately do NOT clear the token on a failed refresh: a transient
 *          network blip must not log the user out. A genuinely dead token 401s on the
 *          refresh call itself, and TokenAuthenticator is the single place that ends
 *          the session — mirroring the web's 401 interceptor.
 */
class TokenRefresher(
    private val tokenStore: TokenStore,
    private val authApi: AuthApi,
    private val scope: CoroutineScope,
) {
    fun start() = scope.launch {
        while (true) {
            maybeRefresh()
            delay(CHECK_INTERVAL_MS)
        }
    }

    /** @brief One cheap pass: refresh only if a token exists and is near expiry. */
    suspend fun maybeRefresh() {
        val token = tokenStore.current() ?: return            // logged out → nothing to do
        val expiry = JwtUtils.expiryMs(token)
        if (expiry <= 0L) return                              // unparseable → don't hammer
        if (expiry - System.currentTimeMillis() > REFRESH_WINDOW_MS) return  // plenty of life left

        try {
            tokenStore.save(authApi.refresh().accessToken)
        } catch (e: Exception) {
            // Transient failure: keep the session and retry next tick. A truly dead
            // token 401s here and TokenAuthenticator clears it.
            Log.w(TAG, "token refresh attempt failed; will retry", e)
        }
    }

    private companion object {
        const val TAG = "TokenRefresher"
        const val CHECK_INTERVAL_MS = 60 * 1000L          // heartbeat
        const val REFRESH_WINDOW_MS = 15 * 60 * 1000L     // renew within 15 min of expiry
    }
}