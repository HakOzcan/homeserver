package cc.hakserver.tv.ui.home

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
import kotlinx.coroutines.launch

/** @brief Phase-1 home VM: loads the signed-in user and handles logout. */
class HomeViewModel(private val authRepository: AuthRepository) : ViewModel() {

    private val _username = MutableStateFlow<String?>(null)
    val username: StateFlow<String?> = _username.asStateFlow()

    init {
        viewModelScope.launch {
            try { _username.value = authRepository.me().username } catch (e: Exception) { /* 401 → gate → login */
            }
        }
    }

    fun logout() = viewModelScope.launch { authRepository.logout() }

    companion object {
        val Factory = viewModelFactory {
            initializer { HomeViewModel((this[APPLICATION_KEY] as TvApp).container.authRepository) }
        }
    }
}