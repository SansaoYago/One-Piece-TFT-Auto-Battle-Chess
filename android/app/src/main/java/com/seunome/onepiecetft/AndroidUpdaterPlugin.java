package com.seunome.onepiecetft;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AndroidUpdater")
public class AndroidUpdaterPlugin extends Plugin {
    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        String manifestUrl = call.getString("manifestUrl", "");
        if (manifestUrl == null || manifestUrl.trim().isEmpty()) {
            call.reject("Manifesto de atualização Android não configurado.");
            return;
        }

        new Thread(() -> {
            try {
                JSONObject manifest = readJson(manifestUrl);
                PackageInfo packageInfo = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
                String currentVersion = packageInfo.versionName == null ? "0.0.0" : packageInfo.versionName;
                int currentCode = getVersionCode(packageInfo);
                int latestCode = manifest.optInt("versionCode", currentCode);

                JSObject result = new JSObject();
                result.put("currentVersion", currentVersion);
                result.put("currentCode", currentCode);
                result.put("latestVersion", manifest.optString("version", currentVersion));
                result.put("latestCode", latestCode);
                result.put("updateAvailable", latestCode > currentCode);
                result.put("downloadUrl", manifest.optString("downloadUrl", ""));
                result.put("releaseNotes", manifest.optString("releaseNotes", ""));
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Não foi possível verificar a atualização Android.", error);
            }
        }).start();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String downloadUrl = call.getString("downloadUrl", "");
        String version = call.getString("version", "update");
        if (downloadUrl == null || downloadUrl.trim().isEmpty()) {
            call.reject("URL do APK não configurada.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settingsIntent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
            );
            getActivity().startActivity(settingsIntent);
            JSObject result = new JSObject();
            result.put("requiresPermission", true);
            call.resolve(result);
            return;
        }

        new Thread(() -> {
            File temporaryApk = new File(getContext().getCacheDir(), "one-piece-tft-" + safeFilePart(version) + ".apk.part");
            File apk = new File(getContext().getCacheDir(), "one-piece-tft-" + safeFilePart(version) + ".apk");
            try {
                download(downloadUrl, temporaryApk);
                if (apk.exists() && !apk.delete()) {
                    throw new IllegalStateException("Não foi possível substituir o APK temporário.");
                }
                if (!temporaryApk.renameTo(apk)) {
                    throw new IllegalStateException("Não foi possível finalizar o download do APK.");
                }

                Uri apkUri = FileProvider.getUriForFile(
                        getContext(),
                        getContext().getPackageName() + ".fileprovider",
                        apk
                );
                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(installIntent);

                JSObject result = new JSObject();
                result.put("started", true);
                call.resolve(result);
            } catch (Exception error) {
                if (temporaryApk.exists()) {
                    temporaryApk.delete();
                }
                call.reject("Não foi possível baixar o APK de atualização.", error);
            }
        }).start();
    }

    private JSONObject readJson(String manifestUrl) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(manifestUrl).openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(15000);
        connection.setRequestMethod("GET");
        connection.setRequestProperty("Accept", "application/json");
        if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) {
            throw new IllegalStateException("Manifesto HTTP " + connection.getResponseCode());
        }
        try (InputStream input = connection.getInputStream()) {
            byte[] buffer = new byte[8192];
            StringBuilder content = new StringBuilder();
            int read;
            while ((read = input.read(buffer)) != -1) {
                content.append(new String(buffer, 0, read));
            }
            return new JSONObject(content.toString());
        } finally {
            connection.disconnect();
        }
    }

    private void download(String downloadUrl, File destination) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(downloadUrl).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setRequestMethod("GET");
        if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) {
            throw new IllegalStateException("Download HTTP " + connection.getResponseCode());
        }
        try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(destination)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            output.flush();
        } finally {
            connection.disconnect();
        }
    }

    private int getVersionCode(PackageInfo packageInfo) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return (int) packageInfo.getLongVersionCode();
        }
        return packageInfo.versionCode;
    }

    private String safeFilePart(String value) {
        return value == null ? "update" : value.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}