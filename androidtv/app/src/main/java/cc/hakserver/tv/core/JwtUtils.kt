package cc.hakserver.tv.core

import android.util.Base64
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * @brief Reads a JWT's `exp` (expiry) claim, in epoch milliseconds.
 * @param token The raw JWT (three base64url segments separated by dots).
 * @return Expiry in ms since epoch, or 0 if it can't be parsed.
 * @details The middle segment is the JSON payload. We read only the public `exp`
 *          claim to schedule proactive refresh; the signature is still verified
 *          server-side on every call. Mirrors the web client's getTokenExpiryMs().
 */
object JwtUtils {
    private val json = Json { ignoreUnknownKeys = true }

    @Serializable
    private data class Payload(val exp: Long = 0)

    fun expiryMs(token: String): Long = try {
        val payload = token.split(".")[1]
        val bytes = Base64.decode(payload, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
        json.decodeFromString<Payload>(String(bytes)).exp * 1000
    } catch (e: Exception) {
        0
    }
}