package cc.hakserver.tv.ui.common

import android.content.Context
import android.util.AttributeSet
import android.widget.TextView

/**
 * @brief A TextView whose marquee (scrolling ellipsize) is ALWAYS active.
 *
 * @details Android only animates `android:ellipsize="marquee"` while a view is
 *          focused or selected. In media3's settings popup the *row* receives
 *          focus, not the inner text view, so a normal TextView would never
 *          scroll. We force it two ways:
 *           - `isFocused()` always reports true, so the marquee's start gate
 *             passes when the text is laid out / re-bound.
 *           - on (re)attach we set `isSelected = true`, which kicks the
 *             animation for recycled rows scrolled back into view.
 *
 *          Pair with `singleLine="true"`, `ellipsize="marquee"`, and
 *          `marqueeRepeatLimit="marquee_forever"` in XML. Extends the plain
 *          framework TextView (not AppCompat) since appcompat isn't a dependency.
 */
class MarqueeTextView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : TextView(context, attrs, defStyleAttr) {

    override fun isFocused(): Boolean = true

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        isSelected = true
    }
}
