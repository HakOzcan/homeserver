package cc.hakserver.tv.data.media

import retrofit2.http.GET

/** @brief Retrofit interface for the /media endpoints. */
interface MediaApi {
    @GET("media/library")
    suspend fun getLibrary(): LibraryResponse
}