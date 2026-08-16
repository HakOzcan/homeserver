package cc.hakserver.tv.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import cc.hakserver.tv.core.network.AuthInterceptor
import cc.hakserver.tv.core.network.TokenAuthenticator
import cc.hakserver.tv.data.auth.AuthApi
import cc.hakserver.tv.data.auth.AuthRepository
import cc.hakserver.tv.data.auth.TokenRefresher
import cc.hakserver.tv.data.auth.TokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth")

/**
 * @brief Hand-rolled dependency container (no Hilt yet).
 * @details Builds the whole auth spine once and hangs it off the Application.
 *          Explicit on purpose so the wiring is visible while learning; Hilt can
 *          replace this later without touching the classes it constructs.
 */
class AppContainer(
    context: Context,
    private val appScope: CoroutineScope = CoroutineScope(SupervisorJob()),
) {
    private val tokenStore = TokenStore(context.dataStore)
    private val json = Json { ignoreUnknownKeys = true }

    private val okHttp = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor(tokenStore))
        .authenticator(TokenAuthenticator(tokenStore))
        // BASIC only — never HEADERS/BODY here, or the Bearer token lands in logcat.
        .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttp)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    private val authApi = retrofit.create(AuthApi::class.java)

    val authRepository = AuthRepository(authApi, tokenStore)
    private val tokenRefresher = TokenRefresher(tokenStore, authApi, appScope)

    /** @brief Load the cached token and start the proactive refresh loop. */
    suspend fun initialize() {
        tokenStore.load()
        tokenRefresher.start()
    }

    private companion object { const val BASE_URL = "https://api.hakserver.cc/api/" }
}