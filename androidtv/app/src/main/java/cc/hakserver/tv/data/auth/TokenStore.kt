package cc.hakserver.tv.data.auth

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/**
 * @brief Single source of truth for the access token.
 * @details Persisted in DataStore, mirrored in a @Volatile field for synchronous
 *          reads (OkHttp's interceptor/authenticator run off the main thread and
 *          need the token *now*). `tokenFlow` lets the UI and the proactive
 *          refresher react to login/logout.
 */
class TokenStore(private val dataStore: DataStore<Preferences>) {

    @Volatile private var cached: String? = null

    val tokenFlow: Flow<String?> = dataStore.data.map { it[KEY] }

    /** @brief Populate the in-memory cache once at app start. */
    suspend fun load() { cached = dataStore.data.map { it[KEY] }.first() }

    /** @brief Synchronous current token, for the OkHttp interceptor/authenticator. */
    fun current(): String? = cached

    suspend fun save(token: String) { cached = token; dataStore.edit { it[KEY] = token } }

    suspend fun clear() { cached = null; dataStore.edit { it.remove(KEY) } }

    private companion object { val KEY = stringPreferencesKey("access_token") }
}