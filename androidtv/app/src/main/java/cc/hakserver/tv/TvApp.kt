package cc.hakserver.tv

import android.app.Application
import cc.hakserver.tv.di.AppContainer
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

/**
 * @brief Application subclass that owns the AppContainer for the process lifetime.
 * @details Registered via android:name= ".TvApp". Loads the saved token and starts
 *          the proactive refresher at startup.
 */
class TvApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        MainScope().launch { container.initialize() }
    }
}