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
import android.net.Uri
import androidx.annotation.OptIn
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import cc.hakserver.tv.ui.detail.DetailScreen
import cc.hakserver.tv.ui.player.PlayerScreen

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
                    true -> AppNavHost()
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

@Composable
private fun AppNavHost() {
    val nav = rememberNavController()
    NavHost(navController = nav, startDestination = "browse") {
        composable("browse") {
            BrowseScreen(onItemClick = { id -> nav.navigate("detail/$id") })
        }
        composable(
            "detail/{contentId}",
            arguments = listOf(navArgument("contentId") { type = NavType.IntType }),
        ) {
            DetailScreen(onPlay = { url, cId ->
                nav.navigate("player?url=${Uri.encode(url)}&contentId=$cId")
            })
        }
        composable(
            "player?url={url}&contentId={contentId}",
            arguments = listOf(
                navArgument("url") { type = NavType.StringType; defaultValue = "" },
                navArgument("contentId") { type = NavType.IntType; defaultValue = -1 },
            ),
        ) { PlayerScreen() }
    }
}

@Composable
private fun Centered(text: String) {
    Surface(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(text) }
    }
}