package com.otmbangla.pmapp;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure native WebView settings to prevent tiny layout/scaling issues
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings webSettings = webView.getSettings();
            
            // Force WebView to support mobile viewports correctly
            webSettings.setUseWideViewPort(true);
            webSettings.setLoadWithOverviewMode(true);
            
            // Keep text zoom at 100% to override system font accessibility sizes which might distort layout
            webSettings.setTextZoom(100);
        }
    }
}
