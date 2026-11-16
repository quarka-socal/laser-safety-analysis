import java.io.File

plugins {
    alias(libs.plugins.android.application)
}

// Web uygulaması (hesap motoru dahil) tek kaynaktır: ../dist/LazerEmniyet.html.
// Android sürümü bu dosyayı değiştirmeden varlık (asset) olarak gömer; sonuçlar masaüstüyle birebir aynıdır.
val webRoot: File = rootProject.file("..")

// Sürüm, hesap motorunun sürümünden türetilir (js/core/analysis.js → ENGINE_VERSION).
val engineVersion: String = Regex("ENGINE_VERSION = '([0-9]+\\.[0-9]+\\.[0-9]+)'")
    .find(File(webRoot, "js/core/analysis.js").readText())
    ?.groupValues?.get(1)
    ?: error("js/core/analysis.js içinde ENGINE_VERSION bulunamadı")

/**
 * dist/LazerEmniyet.html dosyasını oluşturulan varlık klasörüne kopyalar.
 * Eski bir derlemenin gömülmesini önlemek için motor sürümünü ve Android köprüsünü denetler.
 */
abstract class CopyWebApp : DefaultTask() {
    @get:InputFile
    abstract val source: RegularFileProperty

    @get:Input
    abstract val expectedEngine: Property<String>

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @TaskAction
    fun copy() {
        val src = source.get().asFile
        val html = src.readText()
        val ver = Regex("motor v([0-9.]+), tek dosya derlemesi").find(html)?.groupValues?.get(1)
        if (ver != expectedEngine.get()) {
            throw GradleException(
                "dist/LazerEmniyet.html eski (motor v$ver, kaynak v${expectedEngine.get()}). " +
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
        val (major, minor, patch) = engineVersion.split('.').map { it.toInt() }
        versionCode = major * 10000 + minor * 100 + patch
        versionName = engineVersion
    }

    buildTypes {
        release {
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
