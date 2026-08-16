package cc.hakserver.tv.data.auth

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/** @brief Retrofit interface for the /auth endpoints (relative to the /api base). */
interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): TokenResponse

    @POST("auth/refresh")
    suspend fun refresh(): TokenResponse

    @POST("auth/logout")
    suspend fun logout()

    @GET("auth/me")
    suspend fun me(): MeResponse
}