@file:OptIn(androidx.media3.common.util.UnstableApi::class)
package cc.hakserver.tv.ui.player

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.media3.common.MediaItem
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import cc.hakserver.tv.TvApp
import androidx.media3.common.util.UnstableApi
import cc.hakserver.tv.data.media.MediaRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient

/**
 * @brief Owns the ExoPlayer for one playback: HLS over the authed OkHttp, resume
 *        from saved position, and 10s progress reporting.
 * @details @OptIn opts this class into media3's not-yet-stable APIs without
 *          forcing that on callers.
 */
class PlayerViewModel(
    context: Context,
    private val mediaRepository: MediaRepository,
    okHttp: OkHttpClient,
    private val appScope: CoroutineScope,
    url: String,
    private val contentId: Int,
) : ViewModel() {

    val player: ExoPlayer
    private var reportJob: Job? = null

    init {
        // The whole point: HLS segments/manifest/subs go through our authed client.
        val hlsFactory = HlsMediaSource.Factory(OkHttpDataSource.Factory(okHttp))
        player = ExoPlayer.Builder(context).setMediaSourceFactory(hlsFactory).build().apply {
            setMediaItem(MediaItem.fromUri(url))
            playWhenReady = true
        }

        viewModelScope.launch {
            // Resume: seek BEFORE prepare so playback opens at the saved spot.
            val resumeMs = runCatching {
                val p = mediaRepository.getProgress(contentId)
                if (p.positionSeconds > 0 && (p.durationSeconds <= 0 || p.positionSeconds < p.durationSeconds *
                            0.95))
                    (p.positionSeconds * 1000).toLong() else 0L
            }.getOrDefault(0L)
            if (resumeMs > 0) player.seekTo(resumeMs)
            player.prepare()

            reportJob = launch {
                while (true) { delay(10_000); report() }
            }
        }
    }

    private suspend fun report() {
        val posMs = player.currentPosition
        val durMs = player.duration
        if (posMs > 0 && durMs > 0) {
            runCatching { mediaRepository.updateProgress(contentId, posMs / 1000.0, durMs / 1000.0) }
        }
    }

    override fun onCleared() {
        reportJob?.cancel()
        val posMs = player.currentPosition
        val durMs = player.duration
        player.release()
        // Final position must outlive this VM — send it on the app scope.
        if (posMs > 0 && durMs > 0) {
            appScope.launch { runCatching { mediaRepository.updateProgress(contentId, posMs / 1000.0, durMs /
                    1000.0) } }
        }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as TvApp
                val handle = createSavedStateHandle()
                PlayerViewModel(
                    context = app,
                    mediaRepository = app.container.mediaRepository,
                    okHttp = app.container.okHttp,
                    appScope = app.container.appScope,
                    url = handle.get<String>("url").orEmpty(),
                    contentId = handle.get<Int>("contentId") ?: -1,
                )
            }
        }
    }
}