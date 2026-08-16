package cc.hakserver.tv.data.auth

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** @brief Body for POST /auth/login and /auth/refresh. */
@Serializable
data class LoginRequest(val email: String, val password: String)

/** @brief Response from /auth/login and /auth/refresh. */
@Serializable
data class TokenResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("token_type") val tokenType: String,
)

/** @brief Response from GET /auth/me — the signed-in user. */
@Serializable
data class MeResponse(
    val email: String,
    val username: String,
    @SerialName("is_admin") val isAdmin: Boolean,
    @SerialName("is_active") val isActive: Boolean,
    @SerialName("email_verified") val emailVerified: Boolean,
)