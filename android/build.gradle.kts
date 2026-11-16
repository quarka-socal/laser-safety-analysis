// Üst düzey derleme dosyası. Uygulama yalnız Android çatısını kullanır (AndroidX yok);
// sürümler bu makinedeki Gradle önbelleğinde bulunur, derleme internet gerektirmez.
plugins {
    alias(libs.plugins.android.application) apply false
}
