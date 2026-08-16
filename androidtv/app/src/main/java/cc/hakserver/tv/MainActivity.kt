package cc.hakserver.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import cc.hakserver.tv.ui.browse.BrowseScreen
import cc.hakserver.tv.ui.login.LoginScreen

/**
 * @brief Hosts the app and gates between login and home from AuthRepository.isLoggedIn.
 * @details The screen swaps automatically when a token is stored (login) or cleared
 *          (logout/expiry) — no manual navigation.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val authRepository = (application as TvApp).container.authRepository
        setContent {
            MaterialTheme {
                val loggedIn by authRepository.isLoggedIn.collectAsState(initial = null)
                when (loggedIn) {
                    null -> Splash()
                    false -> LoginScreen()
                    true -> BrowseScreen()
                }
            }
        }
    }
}

@Composable
private fun Splash() {
    Surface(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Hakserver TV")
        }
    }
}