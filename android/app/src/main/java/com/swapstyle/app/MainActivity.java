package com.swapstyle.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * SwapStyle for Android: opens the hosted app full screen.
 * Handles the live camera (getUserMedia) and photo picking (file inputs) for the web app.
 */
public class MainActivity extends Activity {

    static final String APP_URL = "https://yairlarry-commits.github.io/swapstyle/";
    static final String APP_HOST = "yairlarry-commits.github.io";

    private static final int REQ_CAMERA_FOR_WEB = 1;
    private static final int REQ_CAMERA_FOR_PICKER = 2;
    private static final int REQ_PICK_FILE = 3;

    private WebView web;
    private PermissionRequest pendingWebPermission;
    private ValueCallback<Uri[]> pendingFileCallback;
    private WebChromeClient.FileChooserParams pendingFileParams;
    private Uri cameraPhotoUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " SwapStyleApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                boolean ours = APP_HOST.equals(uri.getHost()) && uri.getPath() != null && uri.getPath().startsWith("/swapstyle");
                boolean backend = "https".equals(scheme) && uri.getHost() != null && uri.getHost().endsWith(".supabase.co");
                if (ours || backend) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean wantsVideo = false;
                    for (String r : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) wantsVideo = true;
                    }
                    if (!wantsVideo) {
                        request.deny();
                        return;
                    }
                    if (hasCamera()) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        pendingWebPermission = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA_FOR_WEB);
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFileCallback != null) pendingFileCallback.onReceiveValue(null);
                pendingFileCallback = callback;
                pendingFileParams = params;
                if (params.isCaptureEnabled() && !hasCamera()) {
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA_FOR_PICKER);
                } else {
                    openPicker();
                }
                return true;
            }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(APP_URL);
    }

    private boolean hasCamera() {
        return checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    /** Gallery, plus the camera when the page asked for it (or always, as an extra choice). */
    private void openPicker() {
        Intent gallery = new Intent(Intent.ACTION_GET_CONTENT);
        gallery.addCategory(Intent.CATEGORY_OPENABLE);
        gallery.setType("image/*");

        List<Intent> extras = new ArrayList<>();
        cameraPhotoUri = null;
        if (hasCamera()) {
            try {
                File dir = new File(getCacheDir(), "photos");
                dir.mkdirs();
                File photo = File.createTempFile("swap_", ".jpg", dir);
                cameraPhotoUri = FileProvider.getUriForFile(this, "com.swapstyle.app.files", photo);
                Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
                camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                extras.add(camera);
            } catch (Exception e) {
                cameraPhotoUri = null;
            }
        }

        Intent launch;
        if (pendingFileParams != null && pendingFileParams.isCaptureEnabled() && !extras.isEmpty()) {
            launch = extras.get(0);
        } else {
            launch = Intent.createChooser(gallery, "SwapStyle");
            launch.putExtra(Intent.EXTRA_INITIAL_INTENTS, extras.toArray(new Intent[0]));
        }
        try {
            startActivityForResult(launch, REQ_PICK_FILE);
        } catch (ActivityNotFoundException e) {
            finishPick(null);
        }
    }

    private void finishPick(Uri[] result) {
        if (pendingFileCallback != null) pendingFileCallback.onReceiveValue(result);
        pendingFileCallback = null;
        pendingFileParams = null;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_PICK_FILE) return;
        if (resultCode != RESULT_OK) {
            finishPick(null);
            return;
        }
        if (data != null && data.getData() != null) {
            finishPick(new Uri[]{data.getData()});
        } else if (data != null && data.getClipData() != null && data.getClipData().getItemCount() > 0) {
            finishPick(new Uri[]{data.getClipData().getItemAt(0).getUri()});
        } else if (cameraPhotoUri != null) {
            finishPick(new Uri[]{cameraPhotoUri});
        } else {
            finishPick(null);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == REQ_CAMERA_FOR_WEB && pendingWebPermission != null) {
            if (granted) pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else pendingWebPermission.deny();
            pendingWebPermission = null;
        } else if (requestCode == REQ_CAMERA_FOR_PICKER) {
            openPicker(); // without the camera we still offer the gallery
        }
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }
}
