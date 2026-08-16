package cc.hakserver.tv.data.media

import cc.hakserver.tv.core.API_BASE

/** @brief Library data + poster/backdrop URL builders for the browse screen. */
class MediaRepository(private val mediaApi: MediaApi) {

    suspend fun getLibrary(): LibraryResponse = mediaApi.getLibrary()

    suspend fun getContent(id: Int): ContentDetailDto = mediaApi.getContent(id)
    suspend fun getEpisodes(id: Int): SeasonsResponse = mediaApi.getEpisodes(id)

    /** @brief Full HLS master URL. Note: content_type "movie" maps to the "movies"
     *         folder on disk; TV episodes nest under season/episode. */
    fun hlsMasterUrl(contentType: String, tmdbId: Int, season: Int? = null, episode: Int? = null): String {
        val folder = if (contentType == "movie") "movies" else "tv"
        val path = if (season != null && episode != null) "$folder/$tmdbId/$season/$episode" else "$folder/$tmdbId"
        return "$API_BASE/media/hls/$path/master.m3u8"
    }

    fun posterUrl(type: String, tmdbId: Int) = "$API_BASE/media/image/$type/$tmdbId/poster.jpg"
    fun backdropUrl(type: String, tmdbId: Int) = "$API_BASE/media/image/$type/$tmdbId/backdrop.jpg"
}