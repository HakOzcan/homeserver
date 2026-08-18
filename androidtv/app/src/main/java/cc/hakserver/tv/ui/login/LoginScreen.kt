package cc.hakserver.tv.ui.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.Button
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import cc.hakserver.tv.R

/**
 * @brief TV login form over a full-bleed background image, matching the web design.
 * @details Layered Box: background Image (crop) -> dark scrim -> translucent "glass"
 *          card holding the form. Fields are androidx.compose.material3 (tv-material3
 *          has none); focus with the D-pad and press OK for the on-screen keyboard.
 */
@Composable
fun LoginScreen(viewModel: LoginViewModel = viewModel(factory = LoginViewModel.Factory)) {
    val state by viewModel.state.collectAsState()

    Box(modifier = Modifier.fillMaxSize()) {
        // Layer 1: background photo, cropped to fill the screen.
        Image(
            painter = painterResource(R.drawable.login_bg),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        // Layer 2: dark scrim so foreground text stays readable (web: rgba(0,0,0,0.55)).
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.55f)),
        )
        // Layer 3: the login card, centered.
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .width(440.dp)
                .clip(RoundedCornerShape(22.dp))
                .background(Color.White.copy(alpha = 0.06f))
                .border(
                    width = 1.dp,
                    color = Color.White.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(22.dp),
                )
                .padding(horizontal = 32.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Hakserver TV", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(24.dp))

            OutlinedTextField(
                value = state.email,
                onValueChange = viewModel::onEmailChange,
                label = { Text("Email") },
                singleLine = true,
                modifier = Modifier.width(360.dp),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = state.password,
                onValueChange = viewModel::onPasswordChange,
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.width(360.dp),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction =
                    ImeAction.Done),
            )
            Spacer(Modifier.height(20.dp))

            Button(onClick = viewModel::login, enabled = !state.loading) {
                Text(if (state.loading) "Signing in…" else "Sign in")
            }

            state.error?.let {
                Spacer(Modifier.height(16.dp))
                Text(it, color = MaterialTheme.colorScheme.error)
            }
        }
    }
}