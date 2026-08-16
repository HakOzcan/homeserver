package cc.hakserver.tv.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import cc.hakserver.tv.TvApp
import cc.hakserver.tv.data.auth.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import retrofit2.HttpException

/** @brief UI state for the login form. */
data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
)

/** @brief Holds the form state, calls the repository, maps failures to messages. */
class LoginViewModel(private val authRepository: AuthRepository) : ViewModel() {

    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    fun onEmailChange(v: String) = _state.update { it.copy(email = v, error = null) }
    fun onPasswordChange(v: String) = _state.update { it.copy(password = v, error = null) }

    /** @brief On success the token is stored; MainActivity's gate swaps to Home. */
    fun login() {
        val s = _state.value
        if (s.email.isBlank() || s.password.isBlank()) {
            _state.update { it.copy(error = "Enter your email and password.") }
            return
        }
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            try {
                authRepository.login(s.email.trim(), s.password)
            } catch (e: HttpException) {
                val msg = when (e.code()) {
                    401 -> "Invalid email or password."
                    403 -> "Account not verified or not yet approved."
                    else -> "Login failed (${e.code()})."
                }
                _state.update { it.copy(loading = false, error = msg) }
            } catch (e: Exception) {
                _state.update { it.copy(loading = false, error = "Can't reach the server.") }
            }
        }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer { LoginViewModel((this[APPLICATION_KEY] as TvApp).container.authRepository) }
        }
    }
}