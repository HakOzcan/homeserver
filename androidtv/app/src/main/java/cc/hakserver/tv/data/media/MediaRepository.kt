package cc.hakserver.tv.data.media

import cc.hakserver.tv.core.API_BASE

/** @brief Library data + poster/backdrop URL builders for the browse screen. */
class MediaRepository(private val mediaApi: MediaApi) {

    suspend fun getLibrary(): LibraryResponse = mediaApi.getLibrary()

    fun posterUrl(type: String, tmdbId: Int) = "$API_BASE/media/image/$type/$tmdbId/poster.jpg"
    fun backdropUrl(type: String, tmdbId: Int) = "$API_BASE/media/image/$type/$tmdbId/backdrop.jpg"
}