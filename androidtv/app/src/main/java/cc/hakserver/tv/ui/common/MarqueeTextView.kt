package cc.hakserver.tv.ui.common

import android.content.Context
import android.util.AttributeSet
import android.util.Log
import android.widget.TextView

/**
 * @brief A TextView whose marquee (scrolling ellipsize) is ALWAYS active.
 *
 * @details Android only animates `ellipsize="marquee"` on a view that reports
 *          focus or selection. In media3's popup the *row* holds focus, not this
 *          child, so we fake focus AND re-arm selection whenever the row is
 *          (re)bound with new text — RecyclerView reuses rows, and the text often
 *          arrives after the view is attached, so a single kick isn't enough.
 */
class MarqueeTextView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : TextView(context, attrs, defStyleAttr) {

    override fun isFocused(): Boolean = true

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        Log.d(TAG, "attached: \"$text\"")   // TEMP diagnostic — remove once verified
        reArmMarquee()
    }

    override fun onTextChanged(text: CharSequence?, start: Int, before: Int, after: Int) {
        super.onTextChanged(text, start, before, after)
        reArmMarquee()
    }

    // Toggling selection forces TextView to (re)start the marquee.
    private fun reArmMarquee() {
        isSelected = false
        isSelected = true
    }

    private companion object { const val TAG = "HakMarquee" }
}