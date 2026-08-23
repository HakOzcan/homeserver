package cc.hakserver.tv.ui.browse

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import cc.hakserver.tv.TvApp
import cc.hakserver.tv.data.auth.AuthRepository
import cc.hakserver.tv.data.media.MediaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** @brief A poster tile (display-ready: URL already built). */
data class CardUi(val id: Int, val title: String, val posterUrl: String, val progressPercent: Double? = null)

/** @brief A titled horizontal row of tiles. */
data class RowUi(val title: String, val items: List<CardUi>)

/** @brief The featured banner. */
data class HeroUi(val id: Int, val title: String, val overview: String?, val backdropUrl: String)

/** @brief Browse screen states. */
sealed interface BrowseUiState {
    data object Loading : BrowseUiState
    data class Error(val message: String) : BrowseUiState
    data class Success(val hero: HeroUi?, val rows: List<RowUi>) : BrowseUiState
}

/** @brief Loads /media/library and maps it into hero + rows the UI can render blindly. */
class BrowseViewModel(
    private val mediaRepository: MediaRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<BrowseUiState>(BrowseUiState.Loading)
    val state: StateFlow<BrowseUiState> = _state.asStateFlow()

    init { load() }

    init { load() }   // keep — guarantees the first load regardless of resume timing

    /** @brief First load / explicit retry: show the spinner. */
    fun load() = fetch(showLoading = true)

    /** @brief Silent re-fetch on resume: keep current content visible (no spinner
     *         flash) and swap it only once fresh data arrives — so Continue Watching
     *         reflects progress written by the player. */
    fun refresh() = fetch(showLoading = false)

    private fun fetch(showLoading: Boolean) {
        if (showLoading) _state.value = BrowseUiState.Loading
        viewModelScope.launch {
            try {
                val lib = mediaRepository.getLibrary()

                val hero = lib.hero?.let {
                    HeroUi(it.id, it.title, it.overview, mediaRepository.backdropUrl(it.contentType, it.tmdbId))
                }

                val rows = buildList {
                    if (lib.continueWatching.isNotEmpty()) {
                        add(RowUi("Continue Watching", lib.continueWatching.map {
                            CardUi(it.id, it.title, mediaRepository.posterUrl(it.contentType, it.tmdbId),
                                it.progressPercent)
                        }))
                    }
                    lib.genreRows.forEach { (genre, items) ->
                        add(RowUi(genre, items.map {
                            CardUi(it.id, it.title, mediaRepository.posterUrl(it.contentType, it.tmdbId))
                        }))
                    }
                }
                _state.value = BrowseUiState.Success(hero, rows)
            } catch (e: Exception) {
                // Don't wipe good content on a silent refresh; only surface an error if
                // there's nothing on screen yet.
                if (_state.value !is BrowseUiState.Success) {
                    _state.value = BrowseUiState.Error("Couldn't load your library.")
                }
            }
        }
    }

    fun logout() = viewModelScope.launch { authRepository.logout() }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as TvApp
                BrowseViewModel(app.container.mediaRepository, app.container.authRepository)
            }
        }
    }
}