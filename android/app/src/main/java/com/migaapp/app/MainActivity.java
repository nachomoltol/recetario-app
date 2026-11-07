package com.migaapp.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSendIntent(intent);
    }

    private void handleSendIntent(Intent intent) {
        if (intent != null && Intent.ACTION_SEND.equals(intent.getAction())) {
            String mimeType = intent.getType();
            if (mimeType != null && mimeType.startsWith("text/")) {
                String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (sharedText != null && !sharedText.trim().isEmpty()) {
                    try {
                        String encodedText = URLEncoder.encode(sharedText.trim(), "UTF-8");
                        String targetUrl = "https://migaapp.com/share-target?text=" + encodedText;
                        
                        if (getBridge() != null && getBridge().getWebView() != null) {
                            getBridge().getWebView().post(() -> {
                                getBridge().getWebView().loadUrl(targetUrl);
                            });
                        }
                    } catch (UnsupportedEncodingException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }
}
