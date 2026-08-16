package cc.hakserver.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Button
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Surface
import androidx.tv.material3.Text

/**
 * @brief Entry-point activity that hosts the entire Compose UI.
 * @details On TV there is no edge-to-edge or Scaffold (those are handheld
 *          concepts); we fill the screen with a leanback Surface and drive
 *          everything with the D-pad.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            // androidx.tv.material3.MaterialTheme — the TV design system, distinct
            // from the phone androidx.compose.material3 theme the template made.
            // (We'll port real colors/typography into a TV theme in Phase 2; the
            // generated Theme.kt/Color.kt/Type.kt sit unused until then.)
            MaterialTheme {
                HelloTvScreen()
            }
        }
    }
}

/**
 * @brief Placeholder home screen that proves Compose-for-TV + D-pad focus work.
 * @details The two Buttons are focusable: move between them with the emulator's
 *          arrow keys and watch the focus highlight — that focus behavior is the
 *          entire reason we use androidx.tv.material3 components instead of the
 *          phone ones. Real navigation gets wired up starting in Phase 1 (auth).
 */
@Composable
fun HelloTvScreen() {
    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(text = "Hakserver TV", style = MaterialTheme.typography.displayMedium)
            Spacer(Modifier.height(24.dp))
            Button(onClick = { /* Phase 1: navigate to sign-in */ }) { Text("Sign in") }
            Spacer(Modifier.height(12.dp))
            Button(onClick = { /* placeholder */ }) { Text("About") }
        }
    }
}