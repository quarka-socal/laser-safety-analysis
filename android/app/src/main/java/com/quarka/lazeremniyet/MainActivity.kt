package com.quarka.lazeremniyet

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.print.PrintAttributes
import android.print.PrintManager
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.JsResult
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import android.window.OnBackInvokedDispatcher
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File

/**
 * Lazer Emniyet Analizi — Android kabuğu.
 *
 * Masaüstü sürümüyle aynı, doğrulanmış tek dosyalık web uygulamasını (assets/LazerEmniyet.html)
 * çevrimdışı bir WebView'da çalıştırır. Hesap motoru değişmez; Android'e özgü işler yerel köprüyle:
 *  - rapor: PrintManager (sistem yazdırma ekranında "PDF olarak kaydet")
 *  - JSON / CSV / HTML kaydetme: SAF dosya seçici (ACTION_CREATE_DOCUMENT)
 *  - JSON içe aktarma: SAF dosya seçici (ACTION_OPEN_DOCUMENT)
 *  - geri tuşu: önce açık diyaloğu kapatır
 *  - kalıcı localStorage (envanter, son oturum, Amsler test geçmişi), açık/koyu tema
 *  - Amsler Grid testi: fiziksel ekran yoğunluğu (5 mm kare), test sırasında ekran açık ve parlak
 *
 * Copyright © 2026 S.OCAL — SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Sayfa, ağa hiç çıkmayan sabit bir https kökenden sunulur (shouldInterceptRequest); uygulamanın
 * INTERNET izni yoktur.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private lateinit var root: FrameLayout
    private lateinit var statusScrim: View
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    /** Sayfanın seçtiği dil (Ayarlar); yerel iletiler buna uyar. */
    private var uiLang = "tr"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
            // yalnız debug derlemesi: masaüstündeki chrome://inspect ile sınama
            WebView.setWebContentsDebuggingEnabled(true)
        }
        setupWindow()

        web = WebView(this)
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true // envanter ve oturum (localStorage) kalıcı
            allowFileAccess = false // file:// yok
            allowContentAccess = false // content:// yok (dosyalar yalnız sistem dosya seçicisiyle)
            setGeolocationEnabled(false)
            builtInZoomControls = true // iki parmakla yakınlaştırma (tablolar, grafik)
            displayZoomControls = false
            setSupportMultipleWindows(false)
            javaScriptCanOpenWindowsAutomatically = false
        }
        web.webViewClient = Client()
        web.webChromeClient = Chrome()
        web.addJavascriptInterface(Bridge(), "LazerAndroid")

        statusScrim = View(this).apply { setBackgroundColor(getColor(R.color.header_bg)) }
        root = FrameLayout(this).apply { setBackgroundColor(getColor(R.color.page_bg)) }
        root.addView(web, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        root.addView(statusScrim, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, Gravity.TOP))
        root.setOnApplyWindowInsetsListener { _, insets -> applyInsets(insets) }
        setContentView(root)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { handleBack() }
        }
        // Form durumu sayfanın kendi oturum kaydından (localStorage) geri gelir.
        web.loadUrl(START_URL)
    }

    /** Kenardan kenara çizim: üstte başlık renginde şerit, sayfa sistem çubukları ve klavye kadar içeride. */
    @Suppress("DEPRECATION")
    private fun setupWindow() {
        window.setDecorFitsSystemWindows(false)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            window.statusBarColor = Color.TRANSPARENT
            window.navigationBarColor = Color.TRANSPARENT
        }
        val night = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
        window.decorView.post { setBarIcons(night) }
    }

    /** Durum çubuğu simgeleri koyu başlık üstünde açık renk; gezinme çubuğu simgeleri sayfaya göre. */
    private fun setBarIcons(dark: Boolean) {
        window.insetsController?.setSystemBarsAppearance(
            if (dark) 0 else WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
        )
    }

    /** Sayfanın (uygulama içi Ayarlar) teması: css/app.css ile aynı başlık ve zemin renkleri. */
    private fun applyPageTheme(dark: Boolean) {
        statusScrim.setBackgroundColor(if (dark) 0xFF0B0E14.toInt() else 0xFF151A24.toInt())
        root.setBackgroundColor(if (dark) 0xFF0F131A.toInt() else 0xFFF3F4F7.toInt())
        setBarIcons(dark)
    }

    /** Yerel iletiler (bildirim, onay düğmeleri) sayfada seçilen dilde. */
    private fun msg(key: String): String {
        val en = uiLang == "en"
        return when (key) {
            "ok" -> if (en) "OK" else getString(R.string.ok)
            "cancel" -> if (en) "Cancel" else getString(R.string.cancel)
            "title" -> if (en) getString(R.string.app_name) else "Lazer Emniyet Analizi"
            "saved" -> if (en) "Saved: %1\$s" else getString(R.string.saved)
            "save_failed" -> if (en) "Could not save: %1\$s" else getString(R.string.save_failed)
            "no_picker" -> if (en) "Could not open the file picker." else getString(R.string.no_picker)
            else -> key
        }
    }

    private fun applyInsets(insets: WindowInsets): WindowInsets {
        val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
        val ime = insets.getInsets(WindowInsets.Type.ime())
        web.layoutParams = (web.layoutParams as FrameLayout.LayoutParams).apply {
            setMargins(bars.left, bars.top, bars.right, maxOf(bars.bottom, ime.bottom))
        }
        statusScrim.layoutParams = (statusScrim.layoutParams as FrameLayout.LayoutParams).apply { height = bars.top }
        return WindowInsets.CONSUMED
    }

    // ---------------------------------------------------------------------------------------------
    // Geri tuşu: sayfada açık diyalog/menü varsa onu kapatır, yoksa uygulamadan çıkar.

    @Deprecated("Android 13+ OnBackInvokedCallback kullanılır")
    override fun onBackPressed() {
        handleBack()
    }

    private fun handleBack() {
        web.evaluateJavascript(
            "(function(){try{return !!(window.LE&&LE.app&&LE.app.back());}catch(e){return false;}})()",
        ) { handled -> if (handled != "true") finish() }
    }

    // ---------------------------------------------------------------------------------------------
    // Sayfa yükleme: tek köken, ağ yok.

    private inner class Client : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
            val u = request.url
            if (u.scheme == "https" && u.host == HOST && u.path == "/$PAGE") {
                return WebResourceResponse("text/html", "utf-8", assets.open(PAGE))
            }
            // Uygulama hiçbir dış kaynak kullanmaz; her şey tek HTML dosyasının içindedir.
            return WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), ByteArrayInputStream(ByteArray(0)))
        }

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val u = request.url
            if (u.scheme == "https" && u.host == HOST) return false
            // Sayfada dış bağlantı yoktur. Başka her adres engellenir ve sistem tarayıcısına da verilmez:
            // sayfaya bir şekilde betik sızsa bile adres çubuğu üzerinden veri dışarı taşınamaz.
            return true
        }
    }

    // ---------------------------------------------------------------------------------------------
    // JS diyalogları (Türkçe düğmeler) ve dosya seçici (JSON içe aktarma).

    private inner class Chrome : WebChromeClient() {
        override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean {
            AlertDialog.Builder(this@MainActivity)
                .setTitle(msg("title"))
                .setMessage(message)
                .setPositiveButton(msg("ok")) { _, _ -> result.confirm() }
                .setOnCancelListener { result.confirm() }
                .show()
            return true
        }

        override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
            AlertDialog.Builder(this@MainActivity)
                .setTitle(msg("title"))
                .setMessage(message)
                .setPositiveButton(msg("ok")) { _, _ -> result.confirm() }
                .setNegativeButton(msg("cancel")) { _, _ -> result.cancel() }
                .setOnCancelListener { result.cancel() }
                .show()
            return true
        }

        override fun onShowFileChooser(
            view: WebView,
            callback: ValueCallback<Array<Uri>>,
            params: FileChooserParams,
        ): Boolean {
            fileCallback?.onReceiveValue(null)
            fileCallback = callback
            // JSON dosyaları sağlayıcıya göre farklı MIME türleriyle görünür; içerik sayfada denetlenir.
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType("*/*")
            return try {
                @Suppress("DEPRECATION")
                startActivityForResult(intent, REQ_OPEN)
                true
            } catch (_: ActivityNotFoundException) {
                fileCallback = null
                toast(msg("no_picker"))
                false
            }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Sayfanın çağırdığı yerel köprü: window.LazerAndroid

    private inner class Bridge {
        /** JSON / CSV / HTML dışa aktarma: içerik önce önbelleğe yazılır (süreç ölse de kaybolmaz). */
        @JavascriptInterface
        fun saveFile(name: String, mime: String, content: String) {
            runOnUiThread {
                try {
                    pendingFile().writeText(content, Charsets.UTF_8)
                    getPreferences(MODE_PRIVATE).edit().putString(KEY_PENDING_NAME, name).apply()
                    val type = mime.substringBefore(';').trim().ifEmpty { "application/octet-stream" }
                    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT)
                        .addCategory(Intent.CATEGORY_OPENABLE)
                        .setType(type)
                        .putExtra(Intent.EXTRA_TITLE, name)
                    @Suppress("DEPRECATION")
                    startActivityForResult(intent, REQ_SAVE)
                } catch (e: ActivityNotFoundException) {
                    toast(msg("no_picker"))
                } catch (e: Exception) {
                    toast(msg("save_failed").format(e.message ?: e.javaClass.simpleName))
                }
            }
        }

        /** Sayfa Ayarlar'ından: dil ("tr"/"en") ve etkin tema (koyu mu). */
        @JavascriptInterface
        fun setUi(lang: String, dark: Boolean) {
            runOnUiThread {
                uiLang = if (lang == "en") "en" else "tr"
                applyPageTheme(dark)
            }
        }

        /**
         * Amsler testi: ekranın fiziksel piksel yoğunluğu. Sayfa 5 mm'lik kareleri buradan çizer
         * (CSS px/mm = xdpi / 25,4 / devicePixelRatio). Köşegen denetimi için tam ekran boyutu da verilir.
         */
        @JavascriptInterface
        fun screenMetrics(): String {
            val dm = resources.displayMetrics
            val full = windowManager.maximumWindowMetrics.bounds
            return JSONObject()
                .put("xdpi", dm.xdpi.toDouble())
                .put("ydpi", dm.ydpi.toDouble())
                .put("density", dm.density.toDouble())
                .put("densityDpi", dm.densityDpi)
                .put("widthPixels", full.width())
                .put("heightPixels", full.height())
                .toString()
        }

        /** Amsler testi sırasında ekran açık kalır, parlaklık en yükseğe çıkar ve sayfa yakınlaştırması sıfırlanır. */
        @JavascriptInterface
        fun testScreen(on: Boolean) {
            runOnUiThread {
                val lp = window.attributes
                if (on) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_FULL
                    var n = 0
                    // iki parmakla büyütülmüşse kareler 5 mm olmaz: sayfa normal ölçeğe döner
                    while (web.zoomOut() && n++ < 20) {
                    }
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
                }
                window.attributes = lp
            }
        }

        /** Hakkında: Android uygulamasının sürümü, cihaz, Android ve WebView sürümü. */
        @JavascriptInterface
        fun appInfo(): String {
            val pi = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION") packageManager.getPackageInfo(packageName, 0)
            }
            return JSONObject()
                .put("versionName", pi.versionName ?: "")
                .put("versionCode", pi.longVersionCode)
                .put("release", Build.VERSION.RELEASE)
                .put("sdk", Build.VERSION.SDK_INT)
                .put("device", "${Build.MANUFACTURER} ${Build.MODEL}".trim())
                .put("webview", WebView.getCurrentWebViewPackage()?.versionName ?: "")
                .toString()
        }

        /** Rapor: sayfanın yazdırma görünümü (#report-print) sistem yazdırma ekranına verilir. */
        @JavascriptInterface
        fun print(title: String) {
            runOnUiThread {
                val job = title.ifBlank { msg("title") }
                val pm = getSystemService(PRINT_SERVICE) as PrintManager
                pm.print(
                    job,
                    web.createPrintDocumentAdapter(job),
                    PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build(),
                )
            }
        }
    }

    private fun pendingFile() = File(cacheDir, "bekleyen-kayit")

    @Deprecated("Android çatısının kendi API'si; AndroidX kullanılmıyor")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        when (requestCode) {
            REQ_OPEN -> {
                val cb = fileCallback
                fileCallback = null
                val uri = data?.data
                cb?.onReceiveValue(if (resultCode == RESULT_OK && uri != null) arrayOf(uri) else null)
            }
            REQ_SAVE -> {
                val src = pendingFile()
                val name = getPreferences(MODE_PRIVATE).getString(KEY_PENDING_NAME, "") ?: ""
                val uri = data?.data
                try {
                    if (resultCode == RESULT_OK && uri != null && src.exists()) {
                        contentResolver.openOutputStream(uri, "wt").use { out ->
                            requireNotNull(out) { "çıkış akışı açılamadı" }
                            src.inputStream().use { it.copyTo(out) }
                        }
                        toast(msg("saved").format(name))
                    }
                } catch (e: Exception) {
                    toast(msg("save_failed").format(e.message ?: e.javaClass.simpleName))
                } finally {
                    src.delete()
                }
            }
            else -> @Suppress("DEPRECATION") super.onActivityResult(requestCode, resultCode, data)
        }
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()

    override fun onPause() {
        web.onPause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
    }

    override fun onDestroy() {
        fileCallback?.onReceiveValue(null)
        fileCallback = null
        web.destroy()
        super.onDestroy()
    }

    private companion object {
        /** Ağa çıkmayan sabit köken (Android'in varlık sunumu için ayrılmış alan adı). */
        const val HOST = "appassets.androidplatform.net"
        const val PAGE = "LazerEmniyet.html"
        const val START_URL = "https://$HOST/$PAGE"
        const val REQ_OPEN = 1
        const val REQ_SAVE = 2
        const val KEY_PENDING_NAME = "bekleyenKayitAdi"
    }
}
