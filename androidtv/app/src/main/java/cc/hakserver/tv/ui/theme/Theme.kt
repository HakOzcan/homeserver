package cc.hakserver.tv.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme

/**
 * @brief App-wide dark color scheme mirroring the web client's palette.
 * @details Uses androidx.tv.material3 (NOT compose.material3) so the roles line up
 *          with the tv-material3 components the screens use. Dark-only by design —
 *          the web app has no light mode.
 */
private val HakserverDarkColors = darkColorScheme(
    primary = HakPrimary,
    onPrimary = Color.White,
    background = HakBackground,
    onBackground = HakText,
    surface = HakSurface,
    onSurface = HakText,
    surfaceVariant = HakSurface,
    onSurfaceVariant = HakMuted,
    error = HakDanger,
    onError = Color.White,
)

/**
 * @brief Wraps content in the Hakserver dark theme. Use once at the app root.
 */
@Composable
fun HakserverTvTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = HakserverDarkColors,
        content = content,
    )
}