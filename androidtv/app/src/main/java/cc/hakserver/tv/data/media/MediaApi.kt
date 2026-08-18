package cc.hakserver.tv.data.media

import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Body
import retrofit2.http.POST

/** @brief Retrofit interface for the /media endpoints. */
interface MediaApi {
    @GET("media/library")
    suspend fun getLibrary(): LibraryResponse

    @GET("media/content/{id}")
    suspend fun getContent(@Path("id") id: Int): ContentDetailDto

    @GET("media/content/{id}/episodes")
    suspend fun getEpisodes(@Path("id") id: Int): SeasonsResponse

    @GET("media/progress/{id}")
    suspend fun getProgress(@Path("id") id: Int): ProgressResponse

    @POST("media/progress")
    suspend fun updateProgress(@Body body: ProgressUpdate)
}