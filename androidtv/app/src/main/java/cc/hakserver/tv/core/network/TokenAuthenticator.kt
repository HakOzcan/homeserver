package cc.hakserver.tv.core.network

import cc.hakserver.tv.data.auth.TokenStore
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

/**
 * @brief Handles 401s. Does NOT refresh — this backend can't renew an expired
 *        token, so a 401 means the session is gone. Proactive TokenRefresher
 *        is what keeps us alive; this just resolves races and logs out.
 * @details On 401: if the stored token differs from the one the failed request
 *          used, a proactive refresh landed meanwhile → retry with the new token.
 *          Otherwise the session is dead → clear it (which flips the UI back to
 *          login via TokenStore.tokenFlow) and give up.
 */
class TokenAuthenticator(private val tokenStore: TokenStore) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null // stop retrying → no 401 loop

        val failedToken = response.request.header("Authorization")?.removePrefix("Bearer ")
        val current = tokenStore.current()

        if (current != null && current != failedToken) {
            return response.request.newBuilder()
                .header("Authorization", "Bearer $current")
                .build()
        }

        runBlocking { tokenStore.clear() }
        return null
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) { count++; prior = prior.priorResponse }
        return count
    }
}