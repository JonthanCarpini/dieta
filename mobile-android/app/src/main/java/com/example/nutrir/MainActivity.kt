package com.example.nutrir

import android.net.Uri
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import android.os.Build
import android.content.pm.PackageManager
import android.webkit.JavascriptInterface
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.example.nutrir.theme.NutrirTheme

class MainActivity : ComponentActivity() {
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionRequest: PermissionRequest? = null

    private val requestPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        var allGranted = true
        for (permission in permissions.keys) {
            if (permissions[permission] == false) {
                allGranted = false
                break
            }
        }
        if (allGranted && permissions.isNotEmpty()) {
            pendingPermissionRequest?.grant(pendingPermissionRequest?.resources)
        } else {
            pendingPermissionRequest?.deny()
        }
        pendingPermissionRequest = null
    }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val data = result.data
        val resultUri = if (data == null || result.resultCode != RESULT_OK) null else data.data
        val results = if (resultUri != null) arrayOf(resultUri) else null
        filePathCallback?.onReceiveValue(results)
        filePathCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Solicitar permissão de notificação no Android 13+ (API 33)
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionsLauncher.launch(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS))
            }
        }

        enableEdgeToEdge()
        setContent {
            NutrirTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var webView: WebView? by remember { mutableStateOf(null) }

                    BackHandler(enabled = webView?.canGoBack() == true) {
                        webView?.goBack()
                    }

                    AndroidView(
                        factory = { context ->
                            WebView(context).apply {
                                layoutParams = ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                WebView.setWebContentsDebuggingEnabled(true)
                                addJavascriptInterface(WebAppInterface(context), "AndroidApp")
                                settings.javaScriptEnabled = true
                                settings.domStorageEnabled = true
                                settings.databaseEnabled = true
                                settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                                settings.loadWithOverviewMode = true
                                settings.useWideViewPort = true
                                settings.mediaPlaybackRequiresUserGesture = false
                                settings.cacheMode = WebSettings.LOAD_DEFAULT
                                // Aceita cookies para persistência de sessão
                                android.webkit.CookieManager.getInstance().setAcceptCookie(true)
                                android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                                webViewClient = object : WebViewClient() {
                                    override fun onReceivedSslError(
                                        view: WebView?,
                                        handler: android.webkit.SslErrorHandler?,
                                        error: android.net.http.SslError?
                                    ) {
                                        handler?.proceed()
                                    }

                                    override fun onReceivedError(
                                        view: WebView?,
                                        request: android.webkit.WebResourceRequest?,
                                        error: android.webkit.WebResourceError?
                                    ) {
                                        super.onReceivedError(view, request, error)
                                        android.util.Log.e("WebViewError", "Error: ${error?.description}")
                                    }

                                    override fun shouldOverrideUrlLoading(
                                        view: WebView?,
                                        request: android.webkit.WebResourceRequest?
                                    ): Boolean {
                                        val url = request?.url?.toString() ?: ""
                                        // App URLs load normally inside WebView — do NOT call loadUrl() here
                                        // or the entire SPA reloads (killing JS state) on every internal navigation
                                        if (url.contains("nutrir.online") || url.contains("localhost")) {
                                            return false // let WebView handle it
                                        }
                                        // External URLs (Jitsi, etc.) — open in system browser
                                        if (url.startsWith("http://") || url.startsWith("https://")) {
                                            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                                            context.startActivity(intent)
                                            return true
                                        }
                                        return false
                                    }
                                }
                                webChromeClient = object : WebChromeClient() {
                                    override fun onShowFileChooser(
                                        webView: WebView?,
                                        filePathCallback: ValueCallback<Array<Uri>>?,
                                        fileChooserParams: FileChooserParams?
                                    ): Boolean {
                                        this@MainActivity.filePathCallback?.onReceiveValue(null)
                                        this@MainActivity.filePathCallback = filePathCallback

                                        val intent = fileChooserParams?.createIntent()
                                        if (intent != null) {
                                            try {
                                                fileChooserLauncher.launch(intent)
                                            } catch (e: Exception) {
                                                this@MainActivity.filePathCallback = null
                                                return false
                                            }
                                        } else {
                                            this@MainActivity.filePathCallback = null
                                            return false
                                        }
                                        return true
                                    }

                                     override fun onPermissionRequest(request: PermissionRequest?) {
                                         val resources = request?.resources ?: arrayOf()
                                         val permissionsNeeded = mutableListOf<String>()
                                         
                                         for (res in resources) {
                                             if (res == PermissionRequest.RESOURCE_VIDEO_CAPTURE) {
                                                 permissionsNeeded.add(android.Manifest.permission.CAMERA)
                                             } else if (res == PermissionRequest.RESOURCE_AUDIO_CAPTURE) {
                                                 permissionsNeeded.add(android.Manifest.permission.RECORD_AUDIO)
                                             }
                                         }
                                         
                                         if (permissionsNeeded.isNotEmpty()) {
                                             pendingPermissionRequest = request
                                             requestPermissionsLauncher.launch(permissionsNeeded.toTypedArray())
                                         } else {
                                             request?.grant(resources)
                                         }
                                     }

                                    override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                                        android.util.Log.d("WebViewConsole", "${consoleMessage?.message()} -- From line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}")
                                        return true
                                    }
                                }
                                loadUrl("https://nutrir.online")
                                webView = this
                            }
                        },
                        modifier = Modifier.fillMaxSize().systemBarsPadding()
                    )
                }
            }
        }
    }

    inner class WebAppInterface(private val context: Context) {
        private val prefs by lazy {
            context.getSharedPreferences("nutrir_auth", Context.MODE_PRIVATE)
        }

        @JavascriptInterface
        fun saveToken(token: String) {
            prefs.edit().putString("nutrir_token", token).apply()
        }

        @JavascriptInterface
        fun getToken(): String {
            return prefs.getString("nutrir_token", "") ?: ""
        }

        @JavascriptInterface
        fun clearToken() {
            prefs.edit().remove("nutrir_token").apply()
        }

        @JavascriptInterface
        fun scheduleNotification(id: Int, title: String, message: String, timeInMillis: Long) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra("id", id)
                putExtra("title", title)
                putExtra("message", message)
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                id,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent)
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, timeInMillis, pendingIntent)
                }
                android.util.Log.d("WebAppInterface", "Alarme agendado para $timeInMillis (ID: $id)")
            } catch (e: Exception) {
                android.util.Log.e("WebAppInterface", "Erro ao agendar alarme", e)
            }
        }
    }
}
