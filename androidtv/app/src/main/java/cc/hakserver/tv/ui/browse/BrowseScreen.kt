package cc.hakserver.tv.ui.browse

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.Button
import androidx.tv.material3.Card
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import coil.compose.AsyncImage

@Composable
fun BrowseScreen(onItemClick: (Int) -> Unit, viewModel: BrowseViewModel = viewModel(factory = BrowseViewModel.Factory)) {
    val state by viewModel.state.collectAsState()
    Surface(modifier = Modifier.fillMaxSize()) {
        when (val s = state) {
            is BrowseUiState.Loading -> CenterBox { CircularProgressIndicator() }
            is BrowseUiState.Error -> CenterBox { Text(s.message) }
            is BrowseUiState.Success -> LibraryContent(s, onLogout = viewModel::logout, onItemClick = onItemClick)
        }
    }
}

@Composable
private fun LibraryContent(data: BrowseUiState.Success, onLogout: () -> Unit, onItemClick: (Int) -> Unit) {
    val heroFocus = remember { FocusRequester() }
    // Focus the hero's Play button once laid out. The hero sits at the top of the
    // list, so focusing it causes no scroll and the banner stays on screen.
    // (Focusing a card lower down was the old bug: it scrolled the hero off the top.)
    LaunchedEffect(Unit) { runCatching { heroFocus.requestFocus() } }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 48.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Hakserver TV", style = MaterialTheme.typography.headlineSmall)
                Button(onClick = onLogout) { Text("Log out") }
            }
        }

        data.hero?.let { hero ->
            item { Hero(hero = hero, playFocus = heroFocus, onDetails = { onItemClick(hero.id) }) }
        }

        items(data.rows) { row ->
            MediaRow(row = row, onItemClick = onItemClick)
        }
    }
}

@Composable
private fun Hero(hero: HeroUi, playFocus: FocusRequester, onDetails: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxWidth().height(320.dp).padding(horizontal = 48.dp)
            .background(Color(0xFF1A1A1A)),
    ) {
        AsyncImage(
            model = hero.backdropUrl,
            contentDescription = hero.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        Column(modifier = Modifier.align(Alignment.BottomStart).padding(32.dp)) {
            Text(hero.title, style = MaterialTheme.typography.headlineLarge)
            hero.overview?.let {
                Spacer(Modifier.height(8.dp))
                Text(
                    it, maxLines = 2, overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.fillMaxWidth(0.5f),
                )
            }
            Spacer(Modifier.height(16.dp))
            Button(onClick = onDetails, modifier = Modifier.focusRequester(playFocus)) {
                Text("▻ Details")
            }
        }
    }
}

@Composable
private fun MediaRow(row: RowUi, onItemClick: (Int) -> Unit) {
    Column {
        Text(
            row.title, style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(start = 48.dp, bottom = 8.dp),
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 48.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(row.items) { item ->
                PosterCard(item = item, onItemClick = onItemClick)
            }
        }
    }
}

@Composable
private fun PosterCard(item: CardUi, modifier: Modifier = Modifier, onItemClick: (Int) -> Unit) {
    Card(onClick = { onItemClick(item.id) }, modifier = modifier.width(120.dp)) {
        Column {
            Box(modifier = Modifier.size(width = 120.dp, height = 180.dp).background(Color(0xFF2A2A2A))) {
                AsyncImage(
                    model = item.posterUrl,
                    contentDescription = item.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
                item.progressPercent?.let { pct ->
                    LinearProgressIndicator(
                        progress = { (pct / 100.0).toFloat() },
                        modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(),
                    )
                }
            }
            Text(
                item.title, maxLines = 1, overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(4.dp).width(120.dp),
            )
        }
    }
}

@Composable
private fun CenterBox(content: @Composable () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { content() }
}