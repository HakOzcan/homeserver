package cc.hakserver.tv.core.network

import cc.hakserver.tv.data.auth.TokenStore

import okhttp3.Interceptor
import okhttp3.Response

/**
 * @brief Attaches the current access token as a Bearer header on every request.
 * @details login ignores it; refresh, /media, and every HLS segment require it.
 */
class AuthInterceptor(private val tokenStore: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenStore.current()
        val request = if (token != null) {
            chain.request().newBuilder().header("Authorization", "Bearer $token").build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}