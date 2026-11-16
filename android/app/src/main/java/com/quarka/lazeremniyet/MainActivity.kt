package com.quarka.lazeremniyet

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.ApplicationInfo
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
 *  - kalıcı localStorage (envanter ve son oturum), açık/koyu tema
 *
 * Sayfa, ağa hiç çıkmayan sabit bir https kökenden sunulur (shouldInterceptRequest); uygulamanın
 * INTERNET izni yoktur.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private lateinit var statusScrim: View
    private var fileCallback: ValueCallback<Array<Uri>>? = null

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
            allowFileAccess = false
            builtInZoomControls = true // iki parmakla yakınlaştırma (tablolar, grafik)
            displayZoomControls = false
            setSupportMultipleWindows(false)
            javaScriptCanOpenWindowsAutomatically = false
        }
        web.webViewClient = Client()
        web.webChromeClient = Chrome()
        web.addJavascriptInterface(Bridge(), "LazerAndroid")

        statusScrim = View(this).apply { setBackgroundColor(getColor(R.color.header_bg)) }
        val root = FrameLayout(this).apply { setBackgroundColor(getColor(R.color.page_bg)) }
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
        // durum çubuğu simgeleri koyu başlık üstünde açık renk; gezinme çubuğu simgeleri sayfaya göre
        window.decorView.post {
            window.insetsController?.setSystemBarsAppearance(
                if (night) 0 else WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
            )
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
            if (u.host == HOST) return false
            // Sayfadan dışarıya bağlantı yok; olursa uygulama içinde açılmaz, sistem tarayıcısına verilir.
            if (u.scheme == "http" || u.scheme == "https") {
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, u))
                } catch (_: ActivityNotFoundException) {
                }
            }
            return true
        }
    }

    // ---------------------------------------------------------------------------------------------
    // JS diyalogları (Türkçe düğmeler) ve dosya seçici (JSON içe aktarma).

    private inner class Chrome : WebChromeClient() {
        override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean {
            AlertDialog.Builder(this@MainActivity)
                .setTitle(R.string.app_name)
                .setMessage(message)
                .setPositiveButton(R.string.ok) { _, _ -> result.confirm() }
                .setOnCancelListener { result.confirm() }
                .show()
            return true
        }

        override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
            AlertDialog.Builder(this@MainActivity)
                .setTitle(R.string.app_name)
                .setMessage(message)
                .setPositiveButton(R.string.ok) { _, _ -> result.confirm() }
                .setNegativeButton(R.string.cancel) { _, _ -> result.cancel() }
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
                toast(getString(R.string.no_picker))
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
                    toast(getString(R.string.no_picker))
                } catch (e: Exception) {
                    toast(getString(R.string.save_failed, e.message ?: e.javaClass.simpleName))
                }
            }
        }

        /** Rapor: sayfanın yazdırma görünümü (#report-print) sistem yazdırma ekranına verilir. */
        @JavascriptInterface
        fun print(title: String) {
            runOnUiThread {
                val job = title.ifBlank { getString(R.string.app_name) }
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
                        toast(getString(R.string.saved, name))
                    }
                } catch (e: Exception) {
                    toast(getString(R.string.save_failed, e.message ?: e.javaClass.simpleName))
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
