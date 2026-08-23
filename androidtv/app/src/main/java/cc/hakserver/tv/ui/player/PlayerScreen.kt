@file:OptIn(androidx.media3.common.util.UnstableApi::class)
package cc.hakserver.tv.ui.player

import android.graphics.Color
import android.view.View
import android.widget.ImageButton
import android.widget.LinearLayout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import androidx.media3.ui.TrackSelectionDialogBuilder
import cc.hakserver.tv.R
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.WindowManager
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalContext

/** Walk the Compose context wrappers to find the host Activity (for its window). */
private fun Context.findActivity(): Activity? {
    var ctx: Context = this
    while (ctx is ContextWrapper) {
        if (ctx is Activity) return ctx
        ctx = ctx.baseContext
    }
    return null
}

/**
 * @brief Fullscreen player: a media3 PlayerView (default D-pad controls, a
 *        subtitle selector, and a custom video-quality button) bound to the
 *        ViewModel's ExoPlayer.
 */
@Composable
fun PlayerScreen(viewModel: PlayerViewModel = viewModel(factory = PlayerViewModel.Factory)) {
    val context = LocalContext.current
    DisposableEffect(Unit) {
        val window = context.findActivity()?.window
        window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            PlayerView(ctx).apply {
                player = viewModel.player
                useController = true
                setShowSubtitleButton(true)
                setBackgroundColor(Color.BLACK)
                setShutterBackgroundColor(Color.BLACK)
                addVideoQualityButton()
            }
        },
    )
}

/**
 * @brief Inject a video-quality control into media3's built-in control bar.
 * @details media3 has no built-in quality picker (it auto-selects the rendition
 *          via adaptive bitrate), and its settings popup can't be extended. But
 *          PlayerView inflates its controller in the constructor, so the
 *          `exo_basic_controls` row already exists by the time this runs. We add
 *          an ImageButton — styled like the native buttons — that opens media3's
 *          own TrackSelectionDialog for the video renderer. The dialog reads the
 *          player's video track group and applies the pick to
 *          `player.trackSelectionParameters` for us.
 */
private fun PlayerView.addVideoQualityButton() {
    val row = findViewById<LinearLayout>(androidx.media3.ui.R.id.exo_basic_controls) ?: return
    val button = ImageButton(
        context, null, 0,
        androidx.media3.ui.R.style.ExoStyledControls_Button_Bottom, // match native button sizing/ripple
    ).apply {
        setImageResource(R.drawable.ic_video_quality)
        contentDescription = "Video quality"
        setOnClickListener {
            val activePlayer = player ?: return@setOnClickListener
            TrackSelectionDialogBuilder(context, "Video quality", activePlayer, C.TRACK_TYPE_VIDEO)
                .setAllowAdaptiveSelections(true) // keep an "Auto" (adaptive) option
                .setShowDisableOption(false)      // never let the user turn video off entirely
                .build()
                .show()
        }
    }
    // Place it just left of the subtitle (CC) button, grouping the track controls.
    val subtitleIndex = row.indexOfChild(findViewById<View>(androidx.media3.ui.R.id.exo_subtitle))
    row.addView(button, subtitleIndex.coerceAtLeast(0))
}
