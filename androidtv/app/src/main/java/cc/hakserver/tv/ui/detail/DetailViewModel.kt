package cc.hakserver.tv.ui.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import cc.hakserver.tv.TvApp
import cc.hakserver.tv.data.media.ContentDetailDto
import cc.hakserver.tv.data.media.EpisodeDto
import cc.hakserver.tv.data.media.MediaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface DetailUiState {
    data object Loading : DetailUiState
    data class Error(val message: String) : DetailUiState
    data class Success(
        val content: ContentDetailDto,
        val backdropUrl: String,
        val seasons: Map<String, List<EpisodeDto>>, // empty for movies
    ) : DetailUiState
}

/** @brief Loads one title's metadata (+ episodes for TV). Reads contentId from the
 *         nav argument via SavedStateHandle. */
class DetailViewModel(
    private val mediaRepository: MediaRepository,
    private val contentId: Int,
) : ViewModel() {

    private val _state = MutableStateFlow<DetailUiState>(DetailUiState.Loading)
    val state: StateFlow<DetailUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            try {
                val content = mediaRepository.getContent(contentId)
                val backdrop = mediaRepository.backdropUrl(content.contentType, content.tmdbId)
                val seasons = if (content.contentType == "tv")
                    mediaRepository.getEpisodes(contentId).seasons else emptyMap()
                _state.value = DetailUiState.Success(content, backdrop, seasons)
            } catch (e: Exception) {
                _state.value = DetailUiState.Error("Couldn't load this title.")
            }
        }
    }

    /** @brief Full HLS URL for a movie, or a specific TV episode. */
    fun masterUrl(season: Int? = null, episode: Int? = null): String {
        val c = (_state.value as? DetailUiState.Success)?.content ?: return ""
        return mediaRepository.hlsMasterUrl(c.contentType, c.tmdbId, season, episode)
    }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as TvApp
                val id = createSavedStateHandle().get<Int>("contentId") ?: -1
                DetailViewModel(app.container.mediaRepository, id)
            }
        }
    }
}