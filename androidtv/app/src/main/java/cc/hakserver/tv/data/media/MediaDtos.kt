package cc.hakserver.tv.data.media

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class GenreDto(val id: Int, val name: String)

@Serializable
data class ContentDetailDto(
    val id: Int,
    @SerialName("tmdb_id") val tmdbId: Int,
    @SerialName("content_type") val contentType: String,
    val title: String,
    val overview: String? = null,
    val genres: List<GenreDto>? = null,
    val rating: Double? = null,
    @SerialName("release_year") val releaseYear: Int? = null,
    val runtime: Int? = null,
)

@Serializable
data class EpisodeDto(
    @SerialName("season_number") val seasonNumber: Int,
    @SerialName("episode_number") val episodeNumber: Int,
    val title: String? = null,
    val overview: String? = null,
    val runtime: Int? = null,
)

/** @brief GET /media/content/{id}/episodes — keys are season numbers as strings. */
@Serializable
data class SeasonsResponse(val seasons: Map<String, List<EpisodeDto>> = emptyMap())

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

@Serializable
data class ProgressResponse(
    @SerialName("position_seconds") val positionSeconds: Double = 0.0,
    @SerialName("duration_seconds") val durationSeconds: Double = 0.0,
    val completed: Boolean = false,
)

@Serializable
data class ProgressUpdate(
    @SerialName("content_id") val contentId: Int,
    @SerialName("position_seconds") val positionSeconds: Double,
    @SerialName("duration_seconds") val durationSeconds: Double,
)