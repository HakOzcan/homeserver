package cc.hakserver.tv.ui.detail

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.Button
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import cc.hakserver.tv.data.media.ContentDetailDto
import coil.compose.AsyncImage

@Composable
fun DetailScreen(
    onPlay: (url: String, contentId: Int) -> Unit,
    viewModel: DetailViewModel = viewModel(factory = DetailViewModel.Factory),
) {
    val state by viewModel.state.collectAsState()
    Surface(modifier = Modifier.fillMaxSize()) {
        when (val s = state) {
            is DetailUiState.Loading -> CenterBox { CircularProgressIndicator() }
            is DetailUiState.Error -> CenterBox { Text(s.message) }
            is DetailUiState.Success -> DetailContent(
                data = s,
                onPlayMovie = { onPlay(viewModel.masterUrl(), s.content.id) },
                onPlayEpisode = { season, ep -> onPlay(viewModel.masterUrl(season, ep), s.content.id) },
            )
        }
    }
}

@Composable
private fun DetailContent(
    data: DetailUiState.Success,
    onPlayMovie: () -> Unit,
    onPlayEpisode: (Int, Int) -> Unit,
) {
    val content = data.content
    val firstFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) { runCatching { firstFocus.requestFocus() } }

    LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 48.dp)) {
        item {
            Box(Modifier.fillMaxWidth().height(340.dp)) {
                AsyncImage(
                    model = data.backdropUrl, contentDescription = content.title,
                    contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize(),
                )
                Column(Modifier.align(Alignment.BottomStart).padding(48.dp)) {
                    Text(content.title, style = MaterialTheme.typography.displaySmall)
                    Spacer(Modifier.height(8.dp))
                    Text(metaLine(content), style = MaterialTheme.typography.titleSmall)
                }
            }
        }

        content.overview?.let {
            item {
                Text(
                    it, style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(horizontal = 48.dp, vertical = 16.dp).fillMaxWidth(0.7f),
                )
            }
        }

        if (content.contentType == "movie") {
            item {
                Button(onClick = onPlayMovie, modifier = Modifier.padding(horizontal =
                    48.dp).focusRequester(firstFocus)) {
                    Text("▶  Play")
                }
            }
        } else if (data.seasons.isEmpty()) {
            item { Text("No episodes available.", modifier = Modifier.padding(48.dp)) }
        } else {
            data.seasons.entries.sortedBy { it.key.toIntOrNull() ?: 0 }.forEachIndexed { sIndex, (seasonKey,
                episodes) ->
                item {
                    Text(
                        "Season $seasonKey", style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.padding(start = 48.dp, top = 20.dp, bottom = 8.dp),
                    )
                }
                itemsIndexed(episodes) { eIndex, ep ->
                    val focusMod = if (sIndex == 0 && eIndex == 0) Modifier.focusRequester(firstFocus) else
                        Modifier
                    Button(
                        onClick = { onPlayEpisode(ep.seasonNumber, ep.episodeNumber) },
                        modifier = Modifier.padding(horizontal = 48.dp, vertical = 4.dp).then(focusMod),
                    ) {
                        Text("E${ep.episodeNumber}" + (ep.title?.let { "  ·  $it" } ?: ""))
                    }
                }
            }
        }
    }
}

private fun metaLine(c: ContentDetailDto): String = buildList {
    c.releaseYear?.let { add(it.toString()) }
    c.runtime?.let { add("$it min") }
    c.rating?.let { add("★ ${"%.1f".format(it)}") }
    c.genres?.takeIf { it.isNotEmpty() }?.let { add(it.joinToString(", ") { g -> g.name }) }
}.joinToString("  ·  ")

@Composable
private fun CenterBox(content: @Composable () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { content() }
}