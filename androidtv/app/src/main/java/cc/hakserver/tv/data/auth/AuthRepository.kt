package cc.hakserver.tv.data.auth

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * @brief Coordinates auth operations for the UI layer, wrapping AuthApi + TokenStore.
 */
class AuthRepository(
    private val authApi: AuthApi,
    private val tokenStore: TokenStore,
) {
    /** @brief True while a token is stored — drives the login/home gate. */
    val isLoggedIn: Flow<Boolean> = tokenStore.tokenFlow.map { it != null }

    /** @brief Log in and persist the token. Throws on bad credentials (HTTP 401/403). */
    suspend fun login(email: String, password: String) {
        val token = authApi.login(LoginRequest(email, password)).accessToken
        tokenStore.save(token)
    }

    /** @brief Best-effort server session clear, then always drop the local token. */
    suspend fun logout() {
        try { authApi.logout() } catch (e: Exception) { /* ignore */ }
        tokenStore.clear()
    }
}
