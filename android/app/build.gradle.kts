import java.io.File

plugins {
    alias(libs.plugins.android.application)
}

// Web uygulaması (hesap motoru dahil) tek kaynaktır: ../dist/LazerEmniyet.html.
// Android sürümü bu dosyayı değiştirmeden varlık (asset) olarak gömer; sonuçlar masaüstüyle birebir aynıdır.
val webRoot: File = rootProject.file("..")

// Sürümler: uygulama (js/ui/version.js → APP_VERSION) Android sürüm numarasını verir;
// hesap motoru (js/core/analysis.js → ENGINE_VERSION) gömülen dosyanın güncelliği için denetlenir.
fun webVersion(file: String, pattern: String): String =
    Regex(pattern).find(File(webRoot, file).readText())?.groupValues?.get(1)
        ?: error("$file içinde sürüm bulunamadı")
val engineVersion: String = webVersion("js/core/analysis.js", "ENGINE_VERSION = '([0-9]+\\.[0-9]+\\.[0-9]+)'")
val appVersion: String = webVersion("js/ui/version.js", "APP_VERSION = '([0-9]+\\.[0-9]+\\.[0-9]+)'")

/**
 * dist/LazerEmniyet.html dosyasını oluşturulan varlık klasörüne kopyalar.
 * Eski bir derlemenin gömülmesini önlemek için motor sürümünü ve Android köprüsünü denetler.
 */
abstract class CopyWebApp : DefaultTask() {
    @get:InputFile
    abstract val source: RegularFileProperty

    @get:Input
    abstract val expectedEngine: Property<String>

    @get:Input
    abstract val expectedApp: Property<String>

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @TaskAction
    fun copy() {
        val src = source.get().asFile
        val html = src.readText()
        val m = Regex("Lazer Emniyet Analizi ([0-9.]+), motor v([0-9.]+), tek dosya derlemesi").find(html)
        val app = m?.groupValues?.get(1)
        val ver = m?.groupValues?.get(2)
        if (ver != expectedEngine.get() || app != expectedApp.get()) {
            throw GradleException(
                "dist/LazerEmniyet.html eski (uygulama $app, motor v$ver; kaynak ${expectedApp.get()}, v${expectedEngine.get()}). " +
                    "Önce web klasöründe çalıştırın: node tools/build-single.js"
            )
        }
        if (!html.contains("LazerAndroid")) {
            throw GradleException("dist/LazerEmniyet.html Android köprüsünü içermiyor; node tools/build-single.js ile yeniden üretin.")
        }
        val out = outputDir.get().asFile
        out.deleteRecursively()
        out.mkdirs()
        src.copyTo(File(out, "LazerEmniyet.html"), overwrite = true)
    }
}

val copyWebApp = tasks.register<CopyWebApp>("copyWebApp") {
    source.set(File(webRoot, "dist/LazerEmniyet.html"))
    expectedEngine.set(engineVersion)
    expectedApp.set(appVersion)
}

android {
    namespace = "com.quarka.lazeremniyet"
    // Bu makinede kurulu platform 36.1; davranış hedefi Android 15 (targetSdk 35).
    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "com.quarka.lazeremniyet"
        // Android 11+: WindowInsets.Type ve setDecorFitsSystemWindows ile tek bir kenardan kenara yolu.
        minSdk = 30
        targetSdk = 35
        val (major, minor, patch) = appVersion.split('.').map { it.toInt() }
        versionCode = major * 10000 + minor * 100 + patch
        versionName = appVersion
    }

    buildTypes {
        release {
            // Dağıtım derlemesi: hata ayıklanamaz (WebView uzaktan hata ayıklaması ve run-as kapalı).
            // Kurulu sürümle aynı anahtarla imzalanır; böylece telefonda üzerine kurulur, veriler korunur.
            signingConfig = signingConfigs.getByName("debug")
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(copyWebApp, CopyWebApp::outputDir)
    }
}
