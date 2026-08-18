@file:OptIn(androidx.media3.common.util.UnstableApi::class)
package cc.hakserver.tv.ui.player

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView

/**
 * @brief Fullscreen player: a media3 PlayerView (with default D-pad controls and
 *        a subtitle selector) bound to the ViewModel's ExoPlayer.
 */
@Composable
fun PlayerScreen(viewModel: PlayerViewModel = viewModel(factory = PlayerViewModel.Factory)) {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            PlayerView(ctx).apply {
                player = viewModel.player
                useController = true
                setShowSubtitleButton(true)
            }
        },
    )
}