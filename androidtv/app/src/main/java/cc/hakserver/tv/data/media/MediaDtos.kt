package cc.hakserver.tv.data.media

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** @brief One movie/show as returned by /media (only the fields the UI needs). */
@Serializable
data class ContentDto(
    val id: Int,
    @SerialName("tmdb_id") val tmdbId: Int,
    @SerialName("content_type") val contentType: String, // "movie" | "tv"
    val title: String,
    val overview: String? = null,
    val rating: Double? = null,
    @SerialName("release_year") val releaseYear: Int? = null,
    val runtime: Int? = null,
)

/** @brief A "Continue Watching" item — a ContentDto plus playback position. */
@Serializable
data class ContentWithProgressDto(
    val id: Int,
    @SerialName("tmdb_id") val tmdbId: Int,
    @SerialName("content_type") val contentType: String,
    val title: String,
    @SerialName("progress_percent") val progressPercent: Double = 0.0,
    @SerialName("position_seconds") val positionSeconds: Double = 0.0,
    @SerialName("duration_seconds") val durationSeconds: Double = 0.0,
)

/** @brief The whole browse page in one payload (GET /media/library). */
@Serializable
data class LibraryResponse(
    val hero: ContentDto? = null,
    @SerialName("continue_watching") val continueWatching: List<ContentWithProgressDto> = emptyList(),
    @SerialName("recently_added") val recentlyAdded: List<ContentDto> = emptyList(),
    @SerialName("genre_rows") val genreRows: Map<String, List<ContentDto>> = emptyMap(),
)